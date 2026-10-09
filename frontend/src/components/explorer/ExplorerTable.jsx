import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'

// A fast table for thousands of rows. Only the rows on screen are drawn, so
// there is no "Load more": scroll as far as you like.
//
//  - columns: [{ id, header, accessor(row), width, align, cell(row), descFirst,
//                sortable, sortingFn }]
//  - sorting is click a header; Shift+click adds a second sort
//  - rows can be put in groups (groupBy(row) -> { key, label }), each with a
//    header that collapses
//  - the sorting model comes from TanStack Table, the on-screen windowing
//    from TanStack Virtual

const EMPTY = new Set()
const GROUP_HEIGHT = 46
const ROW_HEIGHT = 52

const ExplorerTable = forwardRef(function ExplorerTable(
  {
    columns,
    data,
    sorting,
    onSortingChange,
    groupBy,
    orderGroups,
    groupSummary,
    resetKey,
    rowKey,
    selectedKey,
    onSelect,
    minWidth = 1100,
    height = 'clamp(440px, calc(100vh - 22rem), 900px)',
    emptyMessage = 'Nothing to show.',
    label = 'Table',
  },
  ref,
) {
  const [collapsedState, setCollapsedState] = useState({ key: resetKey, set: new Set() })
  // Collapsed groups are forgotten whenever the grouping changes.
  const collapsed = useMemo(
    () => (collapsedState.key === resetKey ? collapsedState.set : EMPTY),
    [collapsedState, resetKey],
  )
  const scrollRef = useRef(null)

  const defs = useMemo(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (row) => {
          const v = c.accessor(row)
          return v === null || v === '' ? undefined : v
        },
        sortUndefined: 'last',
        sortingFn: c.sortingFn || 'auto',
        sortDescFirst: Boolean(c.descFirst),
        enableSorting: c.sortable !== false,
      })),
    [columns],
  )

  const table = useReactTable({
    data,
    columns: defs,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: true,
    isMultiSortEvent: (e) => e.shiftKey,
    enableSortingRemoval: true,
  })

  const sortedRows = table.getRowModel().rows

  const groups = useMemo(() => {
    if (!groupBy) return [{ key: '__all', label: '', rows: sortedRows.map((r) => r.original), headerless: true }]
    const map = new Map()
    sortedRows.forEach((r) => {
      const { key, label: groupLabel } = groupBy(r.original)
      if (!map.has(key)) map.set(key, { key, label: groupLabel, rows: [] })
      map.get(key).rows.push(r.original)
    })
    const list = [...map.values()]
    return orderGroups ? orderGroups(list) : list.sort((a, b) => b.rows.length - a.rows.length)
  }, [sortedRows, groupBy, orderGroups])

  const flat = useMemo(() => {
    const out = []
    groups.forEach((g) => {
      if (!g.headerless) out.push({ type: 'group', group: g })
      if (g.headerless || !collapsed.has(g.key)) g.rows.forEach((row) => out.push({ type: 'row', row }))
    })
    return out
  }, [groups, collapsed])

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (flat[i].type === 'group' ? GROUP_HEIGHT : ROW_HEIGHT),
    getItemKey: (i) => (flat[i].type === 'group' ? `g:${flat[i].group.key}` : `r:${rowKey(flat[i].row)}`),
    overscan: 12,
  })

  function setCollapsed(next) {
    setCollapsedState({ key: resetKey, set: next })
  }
  function toggleGroup(key) {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  useImperativeHandle(
    ref,
    () => ({
      collapseAll: () => setCollapsed(new Set(groups.filter((g) => !g.headerless).map((g) => g.key))),
      expandAll: () => setCollapsed(new Set()),
      scrollToTop: () => scrollRef.current?.scrollTo({ top: 0 }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, resetKey],
  )

  const template = columns.map((c) => c.width || 'minmax(100px, 1fr)').join(' ')
  const headerGroup = table.getHeaderGroups()[0]
  const multi = sorting.length > 1

  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-3xl border border-line/10 bg-surface px-6 text-center text-sm text-ink-3"
        style={{ height: 240 }}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      role="table"
      aria-label={label}
      aria-rowcount={flat.length}
      className="relative overflow-auto rounded-3xl border border-line/10 bg-surface"
      style={{ height }}
    >
      <div style={{ minWidth }}>
        <div
          role="row"
          className="sticky top-0 z-10 grid items-center border-b border-line/10 bg-surface px-4"
          style={{ gridTemplateColumns: template, height: 44 }}
        >
          {headerGroup.headers.map((h, i) => {
            const col = columns[i]
            const sorted = h.column.getIsSorted()
            const canSort = h.column.getCanSort()
            return (
              <div
                key={h.id}
                role="columnheader"
                aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                className={`px-2 ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {canSort ? (
                  <button
                    type="button"
                    onClick={h.column.getToggleSortingHandler()}
                    title="Click to sort. Shift+click to add a second sort."
                    className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      sorted ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
                    } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {sorted === 'asc' && <ArrowUp size={13} />}
                    {sorted === 'desc' && <ArrowDown size={13} />}
                    {sorted && multi && <span className="text-[10px] text-accent">{h.column.getSortIndex() + 1}</span>}
                  </button>
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">{col.header}</span>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const item = flat[vi.index]
            const pos = { position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }

            if (item.type === 'group') {
              const g = item.group
              const open = !collapsed.has(g.key)
              return (
                <div key={vi.key} role="row" aria-rowindex={vi.index + 1} style={pos}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(g.key)}
                    aria-expanded={open}
                    className="flex h-full w-full items-center gap-3 border-b border-line/10 bg-ink/[0.04] px-5 text-left transition-colors hover:bg-ink/[0.07]"
                  >
                    <ChevronRight size={16} className={`shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} />
                    <span className="truncate font-display text-sm font-semibold text-ink">{g.label}</span>
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium tabular-nums text-ink-2">
                      {g.rows.length.toLocaleString('en-US')}
                    </span>
                    {groupSummary && <span className="ml-auto truncate text-xs text-ink-3">{groupSummary(g.rows)}</span>}
                  </button>
                </div>
              )
            }

            const row = item.row
            const key = rowKey(row)
            const selected = selectedKey === key
            return (
              <div
                key={vi.key}
                role="row"
                aria-rowindex={vi.index + 1}
                aria-selected={selected}
                tabIndex={0}
                onClick={() => onSelect(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(row)
                  }
                }}
                className={`grid cursor-pointer items-center border-b border-line/5 px-4 text-sm transition-colors ${
                  selected ? 'bg-accent/10' : 'hover:bg-ink/[0.04]'
                }`}
                style={{ ...pos, gridTemplateColumns: template }}
              >
                {columns.map((c) => (
                  <div
                    key={c.id}
                    role="cell"
                    className={`min-w-0 truncate px-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}
                  >
                    {c.cell ? c.cell(row) : (c.accessor(row) ?? '—')}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default ExplorerTable

import { Copy, RefreshCw, TriangleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { sanitizeSearchTerm } from '../api/client'
import DetailDrawer from '../components/explorer/DetailDrawer'
import ExplorerTable from '../components/explorer/ExplorerTable'
import FacetFilter from '../components/explorer/FacetFilter'
import SegmentedControl from '../components/explorer/SegmentedControl'
import Reveal from '../components/ui/Reveal'
import Skeleton from '../components/ui/Skeleton'
import { NO_MONTH, flattenAppraisal, fmt, storeColor } from '../lib/digest'
import { APPRAISAL_VIEW, readParams, writeParams } from '../lib/explorerParams'
import { useStores } from '../lib/storeContext'
import { useVautoData } from '../lib/vautoData'

const UNKNOWN_MAKE = 'Unknown make'
const DONE = 'Completed'
const NOT_DONE = 'Not completed'
const SORTABLE_IDS = ['year', 'make', 'model', 'vin', 'store', 'status', 'value', 'created', 'done']

function money(value) {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  } catch {
    return String(value)
  }
}

function dateText(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Shows a value from vAuto as it came, without guessing at its shape.
function plain(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return null
    }
  }
  return String(value)
}

function vehicleName(r) {
  return [r.year, r.make, r.model].filter(Boolean).join(' ') || 'Appraisal'
}

// ---- filtering --------------------------------------------------------

const makeOf = (r) => r.make || UNKNOWN_MAKE
const doneOf = (r) => (r.completed ? DONE : NOT_DONE)

function matches(r, f, skip) {
  if (f.term && !r.search.includes(f.term)) return false
  if (skip !== 'status' && f.status.size && !f.status.has(r.status)) return false
  if (skip !== 'make' && f.make.size && !f.make.has(makeOf(r))) return false
  if (skip !== 'done' && f.done.size && !f.done.has(doneOf(r))) return false
  return true
}

function facetOptions(rows, f, skip, valueOf) {
  const counts = new Map()
  rows.forEach((r) => {
    if (matches(r, f, skip)) {
      const v = valueOf(r)
      counts.set(v, (counts.get(v) || 0) + 1)
    }
  })
  return [...counts]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

function averageValue(rows) {
  const known = rows.filter((r) => typeof r.value === 'number')
  if (!known.length) return null
  return Math.round(known.reduce((a, r) => a + r.value, 0) / known.length)
}

// ---- page -------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading appraisals">
      <Skeleton className="h-12" />
      <Skeleton className="h-[480px]" />
    </div>
  )
}

export default function Appraisals() {
  const { status: loadStatus, appraisals, reload, cooling } = useVautoData()
  const { stores: allStores, selectedStores } = useStores()
  const [sp, setSp] = useSearchParams()
  const tableRef = useRef(null)

  const p = useMemo(() => readParams(sp, SORTABLE_IDS, APPRAISAL_VIEW), [sp])
  const update = useCallback(
    (patch) => setSp((prev) => writeParams(prev, patch, APPRAISAL_VIEW), { replace: true }),
    [setSp],
  )

  // Search box: typing is instant, the address updates a moment later.
  const [qInput, setQInput] = useState(p.q)
  useEffect(() => {
    setQInput((cur) => (cur === p.q ? cur : p.q))
  }, [p.q])
  useEffect(() => {
    const t = setTimeout(() => {
      const clean = sanitizeSearchTerm(qInput)
      if (clean !== p.q) update({ q: clean })
    }, 200)
    return () => clearTimeout(t)
  }, [qInput, p.q, update])

  const allRows = useMemo(
    () => (appraisals?.ok ? (appraisals.value.items || []).map(flattenAppraisal) : []),
    [appraisals],
  )

  const storeKey = selectedStores.map((s) => s.id).join('|')
  const scoped = useMemo(() => {
    const ids = new Set(storeKey.split('|'))
    return allRows.filter((r) => ids.has(r.storeId))
  }, [allRows, storeKey])

  const f = useMemo(
    () => ({
      term: sanitizeSearchTerm(p.q).toLowerCase(),
      status: new Set(p.status),
      make: new Set(p.make),
      done: new Set(p.done),
    }),
    [p],
  )

  const filtered = useMemo(() => scoped.filter((r) => matches(r, f)), [scoped, f])

  const facets = useMemo(
    () => ({
      status: facetOptions(scoped, f, 'status', (r) => r.status),
      make: facetOptions(scoped, f, 'make', makeOf),
      done: facetOptions(scoped, f, 'done', doneOf),
    }),
    [scoped, f],
  )

  const summary = useMemo(
    () => ({
      count: filtered.length,
      completed: filtered.filter((r) => r.completed).length,
      avg: averageValue(filtered),
    }),
    [filtered],
  )

  const activeFilters = p.status.length + p.make.length + p.done.length + (p.q ? 1 : 0)

  // ---- table setup ----

  const columns = useMemo(
    () => [
      { id: 'year', header: 'Year', accessor: (r) => r.year, width: '72px', descFirst: true },
      { id: 'make', header: 'Make', accessor: (r) => r.make, width: 'minmax(90px, 1fr)' },
      { id: 'model', header: 'Model', accessor: (r) => r.model, width: 'minmax(110px, 1.2fr)' },
      {
        id: 'vin',
        header: 'VIN',
        accessor: (r) => r.vin,
        width: '160px',
        cell: (r) => <span className="font-mono text-xs text-ink-3">{r.vin || '—'}</span>,
      },
      {
        id: 'store',
        header: 'Store',
        accessor: (r) => r.storeName,
        width: 'minmax(215px, 1.5fr)',
        cell: (r) => (
          <span className="inline-flex items-center gap-2 text-ink-2">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: storeColor(allStores, r.storeId) }} />
            <span className="truncate">{r.storeName}</span>
          </span>
        ),
      },
      { id: 'status', header: 'Status', accessor: (r) => r.status, width: 'minmax(110px, 1fr)', cell: (r) => <span className="truncate text-ink-2">{r.status}</span> },
      {
        id: 'value',
        header: 'Appraised',
        accessor: (r) => r.value,
        width: '112px',
        align: 'right',
        descFirst: true,
        cell: (r) => <span className="font-semibold text-ink">{money(r.value) ?? <span className="font-normal text-ink-3">—</span>}</span>,
      },
      {
        id: 'created',
        header: 'Created',
        accessor: (r) => r.createdTs,
        width: '112px',
        descFirst: true,
        cell: (r) => <span className="text-ink-2">{dateText(r.created) ?? '—'}</span>,
      },
      {
        id: 'done',
        header: 'Completed',
        accessor: (r) => (r.completed ? 1 : 0),
        width: '104px',
        cell: (r) =>
          r.completed ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-300">
              Yes
            </span>
          ) : (
            <span className="text-ink-3">No</span>
          ),
      },
    ],
    [allStores],
  )

  const groupBy = useMemo(() => {
    switch (p.group) {
      case 'status':
        return (r) => ({ key: r.status, label: r.status })
      case 'month':
        return (r) => ({ key: r.monthKey, label: r.monthLabel })
      case 'store':
        return (r) => ({ key: r.storeId, label: r.storeName })
      case 'done':
        return (r) => ({ key: doneOf(r), label: doneOf(r) })
      case 'make':
        return (r) => ({ key: makeOf(r), label: makeOf(r) })
      default:
        return null
    }
  }, [p.group])

  const orderGroups = useMemo(() => {
    if (p.group === 'month') {
      // Newest month first, "No date" last.
      return (list) =>
        [...list].sort((a, b) => {
          if (a.key === NO_MONTH) return 1
          if (b.key === NO_MONTH) return -1
          return b.key.localeCompare(a.key)
        })
    }
    return (list) => [...list].sort((a, b) => b.rows.length - a.rows.length || String(a.label).localeCompare(String(b.label)))
  }, [p.group])

  const groupSummary = useCallback((rows) => {
    const completed = rows.filter((r) => r.completed).length
    const avg = averageValue(rows)
    return [`${fmt(completed)} completed`, avg !== null ? `avg ${money(avg)}` : null].filter(Boolean).join(' · ')
  }, [])

  const onSortingChange = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(p.sort) : updater
      update({ sort: next })
    },
    [p.sort, update],
  )

  // ---- selected appraisal (stored in the address as ?v=store~id) ----

  const rowKey = useCallback((r) => `${r.storeId}~${r.id}`, [])
  const selected = useMemo(() => (p.v ? allRows.find((r) => rowKey(r) === p.v) || null : null), [allRows, p.v, rowKey])
  const closeDrawer = useCallback(() => update({ v: '' }), [update])
  const [copied, setCopied] = useState(false)

  async function copyVin() {
    try {
      await navigator.clipboard.writeText(selected.vin)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: nothing to do.
    }
  }

  const sections = useMemo(() => {
    if (!selected) return []
    const raw = selected.raw
    const v = raw.vehicle || {}
    return [
      {
        title: 'Vehicle',
        fields: [
          { label: 'VIN', value: plain(v.vin) },
          { label: 'Year', value: plain(v.year) },
          { label: 'Make', value: plain(v.make) },
          { label: 'Model', value: plain(v.model) },
          { label: 'Series / trim', value: plain(v.series) },
          { label: 'Body type', value: plain(v.bodyType) },
          { label: 'Odometer', value: plain(v.odometer) },
          { label: 'Exterior color', value: plain(v.exteriorColor) },
          { label: 'Interior color', value: plain(v.interiorColor) },
        ],
      },
      {
        title: 'Appraisal',
        fields: [
          { label: 'Store', value: selected.storeName },
          { label: 'Status', value: plain(raw.centralizedStatus) },
          { label: 'Completed', value: raw.isCompleted === true ? 'Yes' : raw.isCompleted === false ? 'No' : null },
          { label: 'Created', value: dateText(raw.created) },
          { label: 'Last modified', value: dateText(raw.lastModified) },
          { label: 'Dealer entity', value: plain(raw.organization?.entityLogicalId) },
          {
            label: 'Appraised value',
            value: money(raw.appraisalValue?.appraisedValue) ?? 'Not available (empty, or not permissioned for this account)',
          },
        ],
      },
    ]
  }, [selected])

  const loading = loadStatus === 'idle' || loadStatus === 'loading'
  const busy = loading || loadStatus === 'refreshing'
  const storeIssues = (appraisals?.ok ? appraisals.value.stores : []).filter((s) => !s.ok && selectedStores.some((x) => x.id === s.id))

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">vAuto</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Appraisals</h1>
          <p className="mt-1 text-sm text-ink-3">Every appraisal in one list. Scroll as far as you like, nothing to load.</p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={busy || cooling}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-4 text-sm font-medium text-ink-2 backdrop-blur-xl transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
          {busy ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {loading && <LoadingState />}

        {!loading && appraisals && !appraisals.ok && (
          <div role="alert" className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-700 dark:text-red-200">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Appraisals could not be loaded</div>
              <div className="mt-1 break-words opacity-90">{appraisals.error?.message}</div>
            </div>
          </div>
        )}

        {!loading && storeIssues.map((s) => (
          <div key={s.id} role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>{s.name}</strong> could not be loaded. {s.error}
            </span>
          </div>
        ))}

        {!loading && appraisals?.ok && (
          <Reveal>
            <div className="space-y-3">
              {/* Row 1: search and filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value.slice(0, 60))}
                  placeholder="Search make, model, VIN, status"
                  aria-label="Search appraisals"
                  className="h-10 w-full rounded-xl border border-line/10 bg-surface/60 px-4 text-sm text-ink backdrop-blur-xl placeholder:text-ink-3 focus:border-accent/50 focus:outline-none sm:w-80"
                />
                <FacetFilter label="Status" options={facets.status} selected={p.status} onChange={(v) => update({ status: v })} />
                <FacetFilter label="Completed" options={facets.done} selected={p.done} onChange={(v) => update({ done: v })} />
                <FacetFilter label="Make" options={facets.make} selected={p.make} onChange={(v) => update({ make: v })} />
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQInput('')
                      update({ q: '', status: [], make: [], done: [] })
                    }}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm text-ink-3 transition-colors hover:text-ink"
                  >
                    <X size={15} /> Clear all
                  </button>
                )}
              </div>

              {/* Row 2: grouping and totals */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-ink-3">Group by</span>
                <SegmentedControl label="Group by" options={APPRAISAL_VIEW.groups} value={p.group} onChange={(g) => update({ group: g })} />
                {p.group !== 'none' && (
                  <div className="flex items-center gap-1 text-sm">
                    <button type="button" onClick={() => tableRef.current?.collapseAll()} className="rounded-lg px-2 py-1 text-ink-3 transition-colors hover:text-ink">
                      Collapse all
                    </button>
                    <button type="button" onClick={() => tableRef.current?.expandAll()} className="rounded-lg px-2 py-1 text-ink-3 transition-colors hover:text-ink">
                      Expand all
                    </button>
                  </div>
                )}
                <p className="ml-auto text-sm text-ink-3" aria-live="polite">
                  <span className="font-semibold text-ink">{fmt(summary.count)}</span>
                  {summary.count !== scoped.length && ` of ${fmt(scoped.length)}`} appraisals
                  {` · ${fmt(summary.completed)} completed`}
                  {summary.avg !== null && ` · avg ${money(summary.avg)}`}
                </p>
              </div>

              <ExplorerTable
                ref={tableRef}
                label="Appraisals"
                columns={columns}
                data={filtered}
                sorting={p.sort}
                onSortingChange={onSortingChange}
                groupBy={groupBy}
                orderGroups={orderGroups}
                groupSummary={groupSummary}
                resetKey={`${p.group}`}
                rowKey={rowKey}
                selectedKey={p.v}
                onSelect={(r) => update({ v: rowKey(r) })}
                emptyMessage={activeFilters ? 'No appraisals match these filters.' : 'No appraisals to show.'}
              />
              <p className="text-xs text-ink-3">Click a column to sort, Shift+click to add a second sort. Click a row for details.</p>
            </div>
          </Reveal>
        )}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        onClose={closeDrawer}
        title={selected ? vehicleName(selected) : ''}
        subtitle={selected ? [selected.storeName, dateText(selected.created) && `Created ${dateText(selected.created)}`].filter(Boolean).join(' · ') : ''}
        badge={
          selected ? (
            <span className="inline-flex rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-medium text-ink-2">{selected.status}</span>
          ) : null
        }
        sections={sections}
        actions={
          selected?.vin ? (
            <button
              type="button"
              onClick={copyVin}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-line/10 px-4 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <Copy size={15} /> {copied ? 'Copied' : 'Copy VIN'}
            </button>
          ) : null
        }
      />
    </div>
  )
}

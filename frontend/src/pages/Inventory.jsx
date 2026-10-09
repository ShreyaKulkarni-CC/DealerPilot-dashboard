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
import {
  AGED_OVER_DAYS,
  AGE_BANDS,
  NO_DATE_BAND,
  flattenInventory,
  fmt,
  storeColor,
} from '../lib/digest'
import { GROUPS, readParams, writeParams } from '../lib/explorerParams'
import { useStores } from '../lib/storeContext'
import { useVautoData } from '../lib/vautoData'

const UNKNOWN_MAKE = 'Unknown make'
const SORTABLE_IDS = ['year', 'make', 'model', 'stock', 'store', 'status', 'age', 'price', 'vin']
const BAND_ORDER = [...AGE_BANDS.map((b) => b.label), NO_DATE_BAND]

function money(value, currency) {
  if (value === null || value === undefined) return null
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(value)
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
  return [r.year, r.make, r.model].filter(Boolean).join(' ') || 'Vehicle'
}

// ---- filtering --------------------------------------------------------

const makeOf = (r) => r.make || UNKNOWN_MAKE

function matches(r, f, skip) {
  if (f.term && !r.search.includes(f.term)) return false
  if (skip !== 'status' && f.status.size && !f.status.has(r.status)) return false
  if (skip !== 'band' && f.band.size && !f.band.has(r.band)) return false
  if (skip !== 'make' && f.make.size && !f.make.has(makeOf(r))) return false
  if (skip !== 'disp' && f.disp.size && !f.disp.has(r.disposition || 'Unknown')) return false
  if (f.aged && !(r.age !== null && r.age > AGED_OVER_DAYS)) return false
  return true
}

function facetOptions(rows, f, skip, valueOf, order) {
  const counts = new Map()
  rows.forEach((r) => {
    if (matches(r, f, skip)) {
      const v = valueOf(r)
      counts.set(v, (counts.get(v) || 0) + 1)
    }
  })
  const out = [...counts].map(([value, count]) => ({ value, label: value, count }))
  return order ? out.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value)) : out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// ---- page -------------------------------------------------------------

function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading inventory">
      <Skeleton className="h-12" />
      <Skeleton className="h-[480px]" />
    </div>
  )
}

export default function Inventory() {
  const { status: loadStatus, inventory, reload, cooling } = useVautoData()
  const { stores: allStores, selectedStores } = useStores()
  const [sp, setSp] = useSearchParams()
  const tableRef = useRef(null)

  const p = useMemo(() => readParams(sp, SORTABLE_IDS), [sp])
  const update = useCallback((patch) => setSp((prev) => writeParams(prev, patch), { replace: true }), [setSp])

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
    () => (inventory?.ok ? (inventory.value.items || []).map(flattenInventory) : []),
    [inventory],
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
      band: new Set(p.band),
      make: new Set(p.make),
      disp: new Set(p.disp),
      aged: p.aged,
    }),
    [p],
  )

  const filtered = useMemo(() => scoped.filter((r) => matches(r, f)), [scoped, f])

  const facets = useMemo(
    () => ({
      status: facetOptions(scoped, f, 'status', (r) => r.status),
      band: facetOptions(scoped, f, 'band', (r) => r.band, BAND_ORDER),
      make: facetOptions(scoped, f, 'make', makeOf),
      disp: facetOptions(scoped, f, 'disp', (r) => r.disposition || 'Unknown'),
    }),
    [scoped, f],
  )
  // Only offer the disposition filter if vAuto actually returned dispositions.
  const hasDisposition = useMemo(() => scoped.some((r) => r.disposition), [scoped])

  const summary = useMemo(() => {
    const known = filtered.filter((r) => r.age !== null)
    return {
      count: filtered.length,
      avg: known.length ? Math.round(known.reduce((a, r) => a + r.age, 0) / known.length) : null,
      aged: known.filter((r) => r.age > AGED_OVER_DAYS).length,
    }
  }, [filtered])

  const activeFilters = p.status.length + p.band.length + p.make.length + p.disp.length + (p.aged ? 1 : 0) + (p.q ? 1 : 0)

  // ---- table setup ----

  const columns = useMemo(
    () => [
      { id: 'year', header: 'Year', accessor: (r) => r.year, width: '72px', descFirst: true },
      { id: 'make', header: 'Make', accessor: (r) => r.make, width: 'minmax(100px, 1fr)' },
      { id: 'model', header: 'Model', accessor: (r) => r.model, width: 'minmax(120px, 1.4fr)' },
      { id: 'stock', header: 'Stock #', accessor: (r) => r.stockNumber, width: '104px', sortingFn: 'alphanumeric' },
      {
        id: 'store',
        header: 'Store',
        accessor: (r) => r.storeName,
        width: 'minmax(190px, 1.5fr)',
        cell: (r) => (
          <span className="inline-flex items-center gap-2 text-ink-2">
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: storeColor(allStores, r.storeId) }} />
            <span className="truncate">{r.storeName}</span>
          </span>
        ),
      },
      { id: 'status', header: 'Status', accessor: (r) => r.status, width: 'minmax(110px, 1fr)', cell: (r) => <span className="text-ink-2">{r.status}</span> },
      {
        id: 'age',
        header: 'Days',
        accessor: (r) => r.age,
        width: '120px',
        align: 'right',
        descFirst: true,
        cell: (r) =>
          r.age === null ? (
            <span className="text-ink-3">—</span>
          ) : (
            <span className="inline-flex items-center justify-end gap-2">
              {r.age > AGED_OVER_DAYS && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-500/30 dark:text-amber-300">
                  Aged
                </span>
              )}
              <span className="font-semibold text-ink">{fmt(r.age)}</span>
            </span>
          ),
      },
      {
        id: 'price',
        header: 'List price',
        accessor: (r) => r.listPrice,
        width: '112px',
        align: 'right',
        descFirst: true,
        cell: (r) => <span className="text-ink-2">{money(r.listPrice, r.currency) ?? '—'}</span>,
      },
      {
        id: 'vin',
        header: 'VIN',
        accessor: (r) => r.vin,
        width: '160px',
        cell: (r) => <span className="font-mono text-xs text-ink-3">{r.vin || '—'}</span>,
      },
    ],
    [allStores],
  )

  const groupBy = useMemo(() => {
    switch (p.group) {
      case 'status':
        return (r) => ({ key: r.status, label: r.status })
      case 'band':
        return (r) => ({ key: r.band, label: r.band })
      case 'make':
        return (r) => ({ key: makeOf(r), label: makeOf(r) })
      case 'store':
        return (r) => ({ key: r.storeId, label: r.storeName })
      default:
        return null
    }
  }, [p.group])

  const orderGroups = useMemo(() => {
    if (p.group === 'band') return (list) => [...list].sort((a, b) => BAND_ORDER.indexOf(a.key) - BAND_ORDER.indexOf(b.key))
    return (list) => [...list].sort((a, b) => b.rows.length - a.rows.length || String(a.label).localeCompare(String(b.label)))
  }, [p.group])

  const groupSummary = useCallback((rows) => {
    const known = rows.filter((r) => r.age !== null)
    if (!known.length) return 'No stock-in dates'
    const avg = Math.round(known.reduce((a, r) => a + r.age, 0) / known.length)
    const aged = known.filter((r) => r.age > AGED_OVER_DAYS).length
    return `avg ${avg} days${aged ? ` · ${fmt(aged)} aged` : ''}`
  }, [])

  const onSortingChange = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(p.sort) : updater
      update({ sort: next })
    },
    [p.sort, update],
  )

  // ---- selected vehicle (stored in the address as ?v=store~id) ----

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
        title: 'Inventory',
        fields: [
          { label: 'Store', value: selected.storeName },
          { label: 'Stock #', value: plain(raw.stockNumber) },
          { label: 'Status', value: plain(raw.status) },
          { label: 'Disposition', value: plain(raw.disposition) },
          {
            label: 'Days in inventory',
            value: selected.age === null ? null : `${fmt(selected.age)} (${selected.band})`,
          },
          { label: 'Stocked in', value: dateText(raw.createdOn) },
          { label: 'Last updated', value: dateText(raw.updatedOn) },
        ],
      },
      { title: 'Pricing', fields: [{ label: 'List price', value: money(raw.pricing?.listPrice, raw.pricing?.currency) }] },
      {
        title: 'Certification',
        fields: [
          {
            label: 'Certified',
            value: raw.certification?.certified === true ? 'Yes' : raw.certification?.certified === false ? 'No' : null,
          },
          { label: 'Program', value: plain(raw.certification?.program) },
        ],
      },
    ]
  }, [selected])

  const loading = loadStatus === 'idle' || loadStatus === 'loading'
  const busy = loading || loadStatus === 'refreshing'
  const storeIssues = (inventory?.ok ? inventory.value.stores : []).filter((s) => !s.ok && selectedStores.some((x) => x.id === s.id))

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">vAuto</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-ink-3">Every vehicle in one list. Scroll as far as you like, nothing to load.</p>
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

        {!loading && inventory && !inventory.ok && (
          <div role="alert" className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-800 dark:text-red-200">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Inventory could not be loaded</div>
              <div className="mt-1 break-words opacity-90">{inventory.error?.message}</div>
            </div>
          </div>
        )}

        {!loading && storeIssues.map((s) => (
          <div key={s.id} role="alert" className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800 dark:text-red-200">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>{s.name}</strong> could not be loaded. {s.error}
            </span>
          </div>
        ))}

        {!loading && inventory?.ok && (
          <Reveal>
            <div className="space-y-3">
              {/* Row 1: search and filters */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value.slice(0, 60))}
                  placeholder="Search make, model, VIN, stock #, status"
                  aria-label="Search inventory"
                  className="h-10 w-full rounded-xl border border-line/10 bg-surface/60 px-4 text-sm text-ink backdrop-blur-xl placeholder:text-ink-3 focus:border-accent/50 focus:outline-none sm:w-80"
                />
                <FacetFilter label="Status" options={facets.status} selected={p.status} onChange={(v) => update({ status: v })} />
                <FacetFilter label="Age band" options={facets.band} selected={p.band} onChange={(v) => update({ band: v })} />
                <FacetFilter label="Make" options={facets.make} selected={p.make} onChange={(v) => update({ make: v })} />
                {hasDisposition && (
                  <FacetFilter label="Disposition" options={facets.disp} selected={p.disp} onChange={(v) => update({ disp: v })} />
                )}
                <button
                  type="button"
                  aria-pressed={p.aged}
                  onClick={() => update({ aged: !p.aged })}
                  className={`h-10 rounded-xl border px-3 text-sm font-medium backdrop-blur-xl transition-colors ${
                    p.aged ? 'border-amber-500/50 bg-amber-500/15 text-ink' : 'border-line/10 bg-surface/60 text-ink-2 hover:text-ink'
                  }`}
                >
                  Over {AGED_OVER_DAYS} days
                </button>
                {activeFilters > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQInput('')
                      update({ q: '', status: [], band: [], make: [], disp: [], aged: false })
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
                <SegmentedControl label="Group by" options={GROUPS} value={p.group} onChange={(g) => update({ group: g })} />
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
                  {summary.count !== scoped.length && ` of ${fmt(scoped.length)}`} vehicles
                  {summary.avg !== null && ` · avg ${fmt(summary.avg)} days`}
                  {` · ${fmt(summary.aged)} over ${AGED_OVER_DAYS} days`}
                </p>
              </div>

              <ExplorerTable
                ref={tableRef}
                label="Inventory"
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
                emptyMessage={activeFilters ? 'No vehicles match these filters.' : 'No vehicles to show.'}
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
        subtitle={selected ? [selected.stockNumber && `Stock # ${selected.stockNumber}`, selected.storeName].filter(Boolean).join(' · ') : ''}
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

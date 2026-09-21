import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAppraisals, sanitizeSearchTerm } from '../api/client'
import { LoadingState, ErrorState } from '../components/AsyncState'
import { usePaginatedList } from '../hooks/usePaginatedList'
import RefreshButton from '../components/RefreshButton'

const COLUMNS = [
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'vin', label: 'VIN' },
  { key: 'status', label: 'Status' },
  { key: 'appraisedValue', label: 'Appraised Value' },
  { key: 'created', label: 'Created' },
  { key: 'completed', label: 'Completed' },
]

function flatten(item) {
  return {
    id: item.id,
    year: item.vehicle?.year ?? null,
    make: item.vehicle?.make ?? '',
    model: item.vehicle?.model ?? '',
    vin: item.vehicle?.vin ?? '',
    status: item.centralizedStatus ?? '',
    appraisedValue: item.appraisalValue?.appraisedValue ?? null,
    created: item.created ?? null,
    completed: item.isCompleted ? 'Yes' : 'No',
  }
}

function formatPrice(value) {
  if (value === null || value === undefined) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  } catch {
    return `${value}`
  }
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

export default function Appraisals() {
  const { items: rawItems, loading, loadingMore, error, hasMore, loadMore, refresh } = usePaginatedList(
    (limit) => getAppraisals({ limit }),
    []
  )
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created')
  const [sortDir, setSortDir] = useState('desc')

  const items = useMemo(() => rawItems.map(flatten), [rawItems])

  const filtered = useMemo(() => {
    const term = sanitizeSearchTerm(search).toLowerCase()
    let rows = items
    if (term) {
      rows = rows.filter((row) =>
        [row.make, row.model, row.vin, row.status]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))
      )
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [items, search, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Appraisals</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live from the vAuto Appraisal API ({items.length} appraisal{items.length === 1 ? '' : 's'} loaded
            {hasMore ? ', more available' : ''}).
          </p>
        </div>
        <RefreshButton onClick={refresh} loading={loading} />
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search make, model, VIN, status…"
        maxLength={60}
        className="mt-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      {loading && <LoadingState label="Loading appraisals…" />}
      {error && <ErrorState error={error} />}

      {!loading && !error && (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="cursor-pointer select-none px-4 py-2 text-left font-medium text-slate-600 hover:text-slate-900"
                    >
                      {col.label}
                      {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2">{row.year ?? '—'}</td>
                    <td className="px-4 py-2">{row.make || '—'}</td>
                    <td className="px-4 py-2">{row.model || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.vin || '—'}</td>
                    <td className="px-4 py-2">{row.status || '—'}</td>
                    <td className="px-4 py-2">{formatPrice(row.appraisedValue)}</td>
                    <td className="px-4 py-2">{formatDate(row.created)}</td>
                    <td className="px-4 py-2">{row.completed}</td>
                    <td className="px-4 py-2 text-right">
                      <Link to={`/appraisals/${encodeURIComponent(row.id)}`} className="text-sm text-blue-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-slate-400">
                      No appraisals match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && !search && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

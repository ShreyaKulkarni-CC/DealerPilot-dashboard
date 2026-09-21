import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInventory, sanitizeSearchTerm } from '../api/client'
import { daysInInventory, AGE_THRESHOLD_DAYS } from '../lib/vehicleAge'
import { LoadingState, ErrorState } from '../components/AsyncState'
import AgeDistributionChart from '../components/AgeDistributionChart'
import { usePaginatedList } from '../hooks/usePaginatedList'
import RefreshButton from '../components/RefreshButton'

const COLUMNS = [
  { key: 'year', label: 'Year' },
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'vin', label: 'VIN' },
  { key: 'stockNumber', label: 'Stock #' },
  { key: 'status', label: 'Status' },
  { key: 'listPrice', label: 'List Price' },
  { key: 'age', label: 'Days in Inventory' },
]

function flatten(item) {
  return {
    id: item.inventoryId,
    year: item.vehicle?.year ?? null,
    make: item.vehicle?.make ?? '',
    model: item.vehicle?.model ?? '',
    vin: item.vehicle?.vin ?? '',
    stockNumber: item.stockNumber ?? '',
    status: item.status ?? '',
    listPrice: item.pricing?.listPrice ?? null,
    currency: item.pricing?.currency ?? 'USD',
    age: daysInInventory(item.createdOn),
  }
}

function formatPrice(value, currency) {
  if (value === null || value === undefined) return '—'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    return `${value}`
  }
}

export default function AgedInventory() {
  const { items: rawItems, loading, loadingMore, error, hasMore, loadMore, refresh } = usePaginatedList(
    (limit) => getInventory({ limit }),
    []
  )
  const [search, setSearch] = useState('')

  const items = useMemo(() => rawItems.map(flatten), [rawItems])

  const aged = useMemo(
    () => items.filter((row) => row.age !== null && row.age >= AGE_THRESHOLD_DAYS),
    [items]
  )

  const filtered = useMemo(() => {
    const term = sanitizeSearchTerm(search).toLowerCase()
    let rows = aged
    if (term) {
      rows = rows.filter((row) =>
        [row.make, row.model, row.vin, row.stockNumber, row.status]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))
      )
    }
    return [...rows].sort((a, b) => b.age - a.age)
  }, [aged, search])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Aged Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vehicles at {AGE_THRESHOLD_DAYS}+ days in inventory, oldest first, out of {items.length} loaded
            {hasMore ? ' (more available — load more to check further)' : ''}. Age is calculated from each
            vehicle's stock-in date (createdOn).
          </p>
        </div>
        <RefreshButton onClick={refresh} loading={loading} />
      </div>

      {loading && <LoadingState label="Loading inventory…" />}
      {error && <ErrorState error={error} />}

      {!loading && !error && (
        <>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <AgeDistributionChart ages={aged.map((row) => row.age)} />
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search make, model, VIN, stock #, status…"
            maxLength={60}
            className="mt-4 w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="px-4 py-2 text-left font-medium text-slate-600">
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="bg-amber-50">
                    <td className="px-4 py-2">{row.year ?? '—'}</td>
                    <td className="px-4 py-2">{row.make || '—'}</td>
                    <td className="px-4 py-2">{row.model || '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs">{row.vin || '—'}</td>
                    <td className="px-4 py-2">{row.stockNumber || '—'}</td>
                    <td className="px-4 py-2">{row.status || '—'}</td>
                    <td className="px-4 py-2">{formatPrice(row.listPrice, row.currency)}</td>
                    <td className="px-4 py-2 font-semibold text-amber-700">{row.age}</td>
                    <td className="px-4 py-2 text-right">
                      <Link to={`/inventory/${encodeURIComponent(row.id)}`} className="text-sm text-blue-600 hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 1} className="px-4 py-6 text-center text-slate-400">
                      No aged vehicles match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
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

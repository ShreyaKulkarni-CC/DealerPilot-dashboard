import { useState } from 'react'
import { fmt, storeColor } from '../../lib/digest'

// Wraps a chart with a title, a Chart / Table switch, and the store legend.
// The table is the same numbers as plain text, so nothing depends on seeing
// colour or hovering. Rows look like { label, total, counts: { storeId: n } }.

export function StoreLegend({ stores }) {
  if (stores.length < 2) return null
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Legend">
      {stores.map((s) => (
        <li key={s.id} className="flex items-center gap-2 text-xs text-ink-2">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: storeColor(stores, s.id) }} />
          {s.name}
        </li>
      ))}
    </ul>
  )
}

function DataTable({ rows, stores, labelHeader }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line/10 text-xs text-ink-3">
            <th className="py-2 pr-4 font-medium">{labelHeader}</th>
            {stores.map((s) => (
              <th key={s.id} className="px-3 py-2 text-right font-medium">
                {s.name}
              </th>
            ))}
            {stores.length > 1 && <th className="py-2 pl-3 text-right font-medium">Total</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line/5 last:border-0">
              <td className="py-2 pr-4 text-ink">{r.label}</td>
              {stores.map((s) => (
                <td key={s.id} className="px-3 py-2 text-right tabular-nums text-ink-2">
                  {fmt(r.counts[s.id])}
                </td>
              ))}
              {stores.length > 1 && (
                <td className="py-2 pl-3 text-right font-semibold tabular-nums text-ink">{fmt(r.total)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ChartCard({ title, subtitle, rows, stores, labelHeader = 'Group', footer, children, className = '' }) {
  const [view, setView] = useState('chart')

  return (
    <section className={`h-full rounded-3xl border border-line/10 bg-surface p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-ink-3">{subtitle}</p>}
        </div>
        <div role="group" aria-label={`${title} view`} className="flex rounded-lg border border-line/10 p-0.5 text-xs font-medium">
          {['chart', 'table'].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                view === v ? 'bg-ink/10 text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <StoreLegend stores={stores} />
      </div>

      <div className="mt-4">
        {view === 'chart' ? children : <DataTable rows={rows} stores={stores} labelHeader={labelHeader} />}
      </div>

      {footer && <p className="mt-4 text-xs text-ink-3">{footer}</p>}
    </section>
  )
}

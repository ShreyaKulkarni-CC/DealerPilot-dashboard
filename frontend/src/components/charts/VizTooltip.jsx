import { fmt, storeColor } from '../../lib/digest'

// Tooltip for any chart whose rows look like { label, total, counts: { storeId: n } }.
// Values lead, store names follow. Text uses text colours; the colour only
// appears in the short key line beside each value.
export default function VizTooltip({ active, payload, stores, unit = 'vehicles' }) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0].payload
  if (!row || !row.counts) return null

  return (
    <div className="min-w-[160px] rounded-xl border border-line/15 bg-surface px-3 py-2.5 text-sm shadow-xl">
      <div className="text-xs font-medium text-ink-3">{row.label}</div>
      {stores.map((s) => (
        <div key={s.id} className="mt-1.5 flex items-center gap-2">
          <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: storeColor(stores, s.id) }} />
          <span className="font-semibold text-ink">{fmt(row.counts[s.id])}</span>
          <span className="truncate text-ink-2">{s.name}</span>
        </div>
      ))}
      {stores.length > 1 && (
        <div className="mt-2 border-t border-line/10 pt-1.5 text-xs text-ink-2">
          Total <span className="font-semibold text-ink">{fmt(row.total)}</span> {unit}
        </div>
      )}
    </div>
  )
}

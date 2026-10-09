import { STATUS_LABELS } from '../../lib/platforms'

const STYLES = {
  credentials: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-emerald-500/30',
  in_progress: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/30',
  planned: 'bg-ink/5 text-ink-2 ring-line/10',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || STYLES.planned}`}
    >
      {STATUS_LABELS[status] || STATUS_LABELS.planned}
    </span>
  )
}

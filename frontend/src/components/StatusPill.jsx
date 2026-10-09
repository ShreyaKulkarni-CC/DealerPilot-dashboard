import { STATUS_LABELS, STATUS_STYLES } from '../lib/platforms'

export default function StatusPill({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.planned}`}
    >
      {STATUS_LABELS[status] || STATUS_LABELS.planned}
    </span>
  )
}

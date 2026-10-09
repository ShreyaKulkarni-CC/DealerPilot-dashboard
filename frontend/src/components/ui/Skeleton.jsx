export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-ink/[0.06] ${className}`} />
}

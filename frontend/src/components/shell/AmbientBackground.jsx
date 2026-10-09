// Soft drifting colour behind the whole app. Purely decorative.
export default function AmbientBackground({ animated = false }) {
  const drift = animated ? ' orb-drift' : ''
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={`orb${drift} -left-32 -top-32 h-[520px] w-[520px] bg-accent/20 dark:bg-accent/25`} />
      <div
        className={`orb${drift} -right-40 top-1/3 h-[560px] w-[560px] bg-indigo-500/10 dark:bg-indigo-500/15`}
        style={{ animationDelay: '-9s' }}
      />
      <div
        className={`orb${drift} bottom-[-200px] left-1/3 h-[480px] w-[480px] bg-amber-400/10 dark:bg-amber-500/10`}
        style={{ animationDelay: '-16s' }}
      />
    </div>
  )
}

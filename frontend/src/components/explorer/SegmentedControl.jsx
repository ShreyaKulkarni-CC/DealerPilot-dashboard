import { motion } from 'framer-motion'
import { useId } from 'react'

// A row of options with a sliding highlight. Used for "Group by".
export default function SegmentedControl({ label, options, value, onChange }) {
  const pillId = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex max-w-full items-center overflow-x-auto rounded-xl border border-line/10 bg-surface/60 p-1 backdrop-blur-xl"
    >
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`relative z-10 h-8 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${pillId}`}
                className="absolute inset-0 -z-10 rounded-lg bg-accent/15 ring-1 ring-accent/40"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

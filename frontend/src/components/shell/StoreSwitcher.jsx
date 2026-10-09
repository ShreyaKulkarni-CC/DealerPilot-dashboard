import { motion } from 'framer-motion'
import { Store } from 'lucide-react'
import { useStores } from '../../lib/storeContext'

// Candy Cars | Bridgeland Auto Brokers | Both stores
export default function StoreSwitcher() {
  const { stores, selected, setSelected, loading, error } = useStores()

  if (loading) {
    return <div className="h-10 w-full animate-pulse rounded-xl bg-ink/5 md:w-48" aria-label="Loading stores" />
  }
  if (error || stores.length === 0) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-line/10 px-3 text-sm text-ink-3">
        <Store size={16} /> No stores
      </div>
    )
  }
  if (stores.length === 1) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 text-sm text-ink-2 backdrop-blur-xl">
        <Store size={16} className="text-accent" /> {stores[0].name}
      </div>
    )
  }

  const options = [...stores.map((s) => ({ id: s.id, label: s.name })), { id: 'all', label: 'Both stores' }]

  return (
    <div
      role="radiogroup"
      aria-label="Store"
      className="relative flex h-10 w-full items-center rounded-xl border border-line/10 bg-surface/60 p-1 backdrop-blur-xl md:w-auto"
    >
      {options.map((o) => {
        const active = selected === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSelected(o.id)}
            className={`relative z-10 h-8 min-w-0 flex-auto truncate whitespace-nowrap rounded-lg px-1.5 text-[13px] font-medium transition-colors md:flex-none md:px-3 md:text-sm ${
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {active && (
              <motion.span
                layoutId="store-pill"
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

import { Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { titleFor } from '../../lib/nav'
import { useStores } from '../../lib/storeContext'
import StoreSwitcher from './StoreSwitcher'
import ThemeToggle from './ThemeToggle'

function EnvironmentBadge() {
  const { environment } = useStores()
  if (!environment) return null
  const live = environment === 'production'
  return (
    <span
      className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset sm:inline-flex ${
        live
          ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
          : 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300'
      }`}
      title={live ? 'Showing real store data' : 'Showing sandbox test data, not real stores'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {live ? 'Production' : 'Sandbox'}
    </span>
  )
}

export default function Topbar() {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line/10 bg-bg/60 px-6 backdrop-blur-xl">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">DealerPilot</div>
        <div className="truncate font-display text-lg font-semibold leading-tight text-ink">{titleFor(pathname)}</div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <StoreSwitcher />
        <EnvironmentBadge />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('dp:open-palette'))}
          className="hidden h-10 items-center gap-2 rounded-xl border border-line/10 bg-surface/60 pl-3 pr-2 text-sm text-ink-3 backdrop-blur-xl transition-colors hover:text-ink-2 md:flex"
          aria-label="Open command palette"
        >
          <Search size={16} />
          <span>Search</span>
          <kbd className="rounded-md border border-line/10 bg-ink/5 px-1.5 py-0.5 font-sans text-[11px] text-ink-3">Ctrl K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

import { Menu, Search } from 'lucide-react'
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
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
        live
          ? 'bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-300'
          : 'bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-300'
      }`}
      title={live ? 'Showing real store data' : 'Showing sandbox test data, not real stores'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {/* Text shows on phones and wide screens; on tablets only the dot shows, but screen readers still hear it. */}
      <span className="md:sr-only lg:not-sr-only">{live ? 'Production' : 'Sandbox'}</span>
    </span>
  )
}

export default function Topbar({ onMenu, menuButtonRef, menuOpen = false, showMenuButton = false }) {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/10 bg-bg/60 px-4 py-2.5 backdrop-blur-xl md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
      {showMenuButton && (
        <button
          ref={menuButtonRef}
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line/10 bg-surface/60 text-ink-2 backdrop-blur-xl transition-colors hover:text-ink"
        >
          <Menu size={18} />
        </button>
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">DealerPilot</div>
        <div className="truncate font-display text-lg font-semibold leading-tight text-ink">{titleFor(pathname)}</div>
      </div>

      <div className="order-last w-full md:order-none md:ml-auto md:w-auto">
        <StoreSwitcher />
      </div>
      <div className="ml-auto flex items-center gap-2 md:ml-0 md:gap-3">
        <EnvironmentBadge />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('dp:open-palette'))}
          className="flex h-10 items-center gap-2 rounded-xl border border-line/10 bg-surface/60 px-3 text-sm text-ink-3 backdrop-blur-xl transition-colors hover:text-ink-2 xl:pr-2"
          title="Search (Ctrl K)"
        >
          <Search size={16} />
          <span className="sr-only xl:not-sr-only">Search</span>
          <kbd className="hidden rounded-md border border-line/10 bg-ink/5 px-1.5 py-0.5 font-sans text-[11px] text-ink-3 xl:inline">Ctrl K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}

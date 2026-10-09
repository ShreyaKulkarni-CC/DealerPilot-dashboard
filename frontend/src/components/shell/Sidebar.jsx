import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HOME_LINK, PLATFORM_ICONS, VAUTO_LINKS } from '../../lib/nav'
import { PLATFORMS } from '../../lib/platforms'

const DOT = {
  credentials: 'bg-emerald-400',
  in_progress: 'bg-amber-400',
  planned: 'bg-ink-3/50',
}

function Item({ to, end, icon: Icon, label, collapsed, dot, sub = false, onClick, expanded, active }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      aria-expanded={expanded}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
          sub ? 'py-2 pl-11 pr-3' : 'px-3 py-2.5'
        } ${(active ?? isActive) ? 'text-ink' : 'text-ink-2 hover:text-ink'}`
      }
    >
      {({ isActive: routerActive }) => (
        <>
          {(active ?? routerActive) && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-xl bg-accent/12 ring-1 ring-accent/30"
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            />
          )}
          {!sub && (
            <span className="relative grid h-5 w-5 shrink-0 place-items-center">
              <Icon size={18} />
              {dot && <span className={`absolute -right-1 -top-1 h-2 w-2 rounded-full ring-2 ring-bg ${dot}`} />}
            </span>
          )}
          <span className={`relative overflow-hidden whitespace-nowrap ${collapsed ? 'sr-only' : ''}`}>{label}</span>
          {expanded !== undefined && !collapsed && (
            <ChevronDown
              size={16}
              className={`relative ml-auto text-ink-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </>
      )}
    </NavLink>
  )
}

// vAuto pages: the platform digest plus its sub pages.
const VAUTO_PATHS = ['/platforms/vauto', '/inventory', '/appraisals', '/aged-inventory']

// On phones the sidebar is a menu that slides over the page (`mobile`), opened
// from the top bar. On larger screens it sits beside the page, either full or
// as a thin icon rail (`collapsed`).
export default function Sidebar({ collapsed: railCollapsed, onToggle, mobile = false, open = false, onClose }) {
  const collapsed = mobile ? false : railCollapsed
  const { pathname, search } = useLocation()
  const panelRef = useRef(null)
  const agedView = new URLSearchParams(search).get('aged') === '1'
  // "Inventory" and "Aged inventory" are the same page with a different
  // filter, so the address' ?aged=1 decides which of the two is lit.
  const subActive = (l) => {
    if (l.to === '/inventory') return pathname.startsWith('/inventory') && !agedView
    if (l.to.startsWith('/inventory?')) return pathname === '/inventory' && agedView
    return undefined
  }
  const inVauto = VAUTO_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const [vautoOpen, setVautoOpen] = useState(inVauto)

  // Landing on a vAuto page (from a link, the palette, or the browser's back
  // button) opens the group. After that, clicking vAuto opens or closes it.
  useEffect(() => {
    if (inVauto) setVautoOpen(true)
  }, [inVauto])

  const content = (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 overflow-hidden px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-white shadow-lg shadow-accent/30">
          D
        </span>
        <span className={`whitespace-nowrap font-display text-lg font-semibold tracking-tight ${collapsed ? 'sr-only' : ''}`}>
          DealerPilot
        </span>
        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4" aria-label="Main">
        <Item {...HOME_LINK} collapsed={collapsed} />

        <div
          className={`px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3 ${collapsed ? 'sr-only' : ''}`}
        >
          Platforms
        </div>

        {PLATFORMS.map((p) => (
          <div key={p.id}>
            <Item
              to={`/platforms/${p.id}`}
              icon={PLATFORM_ICONS[p.id]}
              label={p.name}
              collapsed={collapsed}
              dot={DOT[p.status] || DOT.planned}
              onClick={p.id === 'vauto' ? () => setVautoOpen((o) => (inVauto ? !o : true)) : undefined}
              expanded={p.id === 'vauto' ? vautoOpen && !collapsed : undefined}
            />
            <AnimatePresence initial={false}>
              {p.id === 'vauto' && vautoOpen && !collapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-0.5 space-y-0.5">
                    {VAUTO_LINKS.map((l) => (
                      <Item key={l.to} {...l} collapsed={collapsed} sub active={subActive(l)} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {!mobile && (
        <div className="shrink-0 border-t border-line/10 p-3">
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-3 transition-colors hover:text-ink"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={`whitespace-nowrap ${collapsed ? 'sr-only' : ''}`}>Collapse</span>
          </button>
        </div>
      )}
    </>
  )

  // Phone menu: Esc closes it, focus moves in when it opens.
  useEffect(() => {
    if (!mobile || !open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => panelRef.current?.querySelector('a, button')?.focus(), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [mobile, open, onClose])

  if (mobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              aria-hidden="true"
              className="fixed inset-0 z-40 bg-black/50"
            />
            <motion.aside
              key="menu-panel"
              ref={panelRef}
              aria-label="Menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col border-r border-line/10 bg-bg shadow-2xl"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 272 }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      className="sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-line/10 bg-surface/50 backdrop-blur-xl"
    >
      {content}
    </motion.aside>
  )
}

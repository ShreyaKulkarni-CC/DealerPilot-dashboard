import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HOME_LINK, PLATFORM_ICONS, VAUTO_LINKS } from '../../lib/nav'
import { PLATFORMS } from '../../lib/platforms'

const DOT = {
  credentials: 'bg-emerald-400',
  in_progress: 'bg-amber-400',
  planned: 'bg-ink-3/50',
}

function Item({ to, end, icon: Icon, label, collapsed, dot, sub = false, onClick, expanded }) {
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
        } ${isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
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

export default function Sidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation()
  const inVauto = VAUTO_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const [vautoOpen, setVautoOpen] = useState(inVauto)

  // Landing on a vAuto page (from a link, the palette, or the browser's back
  // button) opens the group. After that, clicking vAuto opens or closes it.
  useEffect(() => {
    if (inVauto) setVautoOpen(true)
  }, [inVauto])

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 272 }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      className="sticky top-0 z-40 flex h-screen shrink-0 flex-col border-r border-line/10 bg-surface/50 backdrop-blur-xl"
    >
      <div className="flex h-16 items-center gap-3 overflow-hidden px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-white shadow-lg shadow-accent/30">
          D
        </span>
        <span className={`whitespace-nowrap font-display text-lg font-semibold tracking-tight ${collapsed ? 'sr-only' : ''}`}>
          DealerPilot
        </span>
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
                      <Item key={l.to} {...l} collapsed={collapsed} sub />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      <div className="border-t border-line/10 p-3">
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
    </motion.aside>
  )
}

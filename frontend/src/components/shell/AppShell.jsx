import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { useMediaQuery } from '../../lib/useMediaQuery'
import AmbientBackground from './AmbientBackground'
import CommandPalette from './CommandPalette'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const KEY = 'dp.sidebar'

function readCollapsed() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved === 'collapsed'
  } catch {
    // ignore
  }
  return typeof window !== 'undefined' && window.innerWidth < 1024
}

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const wide = useMediaQuery('(min-width: 768px)')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  // Going to another page closes the phone menu, except the vAuto overview: the
  // vAuto group has sub pages, so the menu stays open to let you pick one.
  useEffect(() => {
    if (pathname !== '/platforms/vauto') setMenuOpen(false)
  }, [pathname])
  useEffect(() => {
    setMenuOpen(false)
  }, [wide])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? 'collapsed' : 'expanded')
    } catch {
      // ignore
    }
  }, [collapsed])

  return (
    <div className="relative min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <AmbientBackground animated={pathname === '/'} />
      <div className="flex">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobile={!wide}
          open={menuOpen}
          onClose={closeMenu}
        />
        <div className="min-w-0 flex-1">
          <Topbar onMenu={() => setMenuOpen(true)} menuButtonRef={menuButtonRef} menuOpen={menuOpen} showMenuButton={!wide} />
          <main id="main" tabIndex={-1} className="px-4 py-6 outline-none md:px-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {outlet}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <CommandPalette />
    </div>
  )
}

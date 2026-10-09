import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
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

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? 'collapsed' : 'expanded')
    } catch {
      // ignore
    }
  }, [collapsed])

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />
      <div className="flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="px-6 py-6">
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

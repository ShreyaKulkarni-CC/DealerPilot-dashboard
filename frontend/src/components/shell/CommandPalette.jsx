import { Command } from 'cmdk'
import { Moon, Store, Sun } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HOME_LINK, PLATFORM_ICONS, VAUTO_LINKS } from '../../lib/nav'
import { PLATFORMS } from '../../lib/platforms'
import { useStores } from '../../lib/storeContext'
import { useTheme } from '../../lib/theme'

// Ctrl/Cmd+K, or the Search button in the top bar.
export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { stores, setSelected } = useStores()
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('dp:open-palette', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('dp:open-palette', onOpen)
    }
  }, [])

  const run = useCallback((fn) => {
    setOpen(false)
    fn()
  }, [])

  const go = (to) => run(() => navigate(to))

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command palette" loop>
      <Command.Input placeholder="Search pages, platforms, stores, actions" />
      <Command.List>
        <Command.Empty>Nothing matches that.</Command.Empty>

        <Command.Group heading="Go to">
          <Command.Item onSelect={() => go(HOME_LINK.to)}>
            <HOME_LINK.icon size={18} /> Home
          </Command.Item>
          {VAUTO_LINKS.map((l) => (
            <Command.Item key={l.to} value={`vauto ${l.label}`} onSelect={() => go(l.to)}>
              <l.icon size={18} /> {l.label}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Platforms">
          {PLATFORMS.map((p) => {
            const Icon = PLATFORM_ICONS[p.id]
            return (
              <Command.Item key={p.id} value={`platform ${p.name}`} onSelect={() => go(`/platforms/${p.id}`)}>
                <Icon size={18} /> {p.name} digest
              </Command.Item>
            )
          })}
        </Command.Group>

        {stores.length > 0 && (
          <Command.Group heading="Store">
            {stores.length > 1 && (
              <Command.Item value="store both all" onSelect={() => run(() => setSelected('all'))}>
                <Store size={18} /> Show both stores
              </Command.Item>
            )}
            {stores.map((s) => (
              <Command.Item key={s.id} value={`store ${s.name}`} onSelect={() => run(() => setSelected(s.id))}>
                <Store size={18} /> Show {s.name} only
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Appearance">
          <Command.Item value="toggle theme dark light" onSelect={() => run(toggle)}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} Switch to {theme === 'dark' ? 'light' : 'dark'} theme
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

// A side panel that slides in from the right. It does not block the page, so
// you can keep scrolling the table behind it. Esc closes it, and focus goes
// back to where it was when it opened.
// sections: [{ title, fields: [{ label, value }] }] (empty values are skipped)
export default function DetailDrawer({ open, onClose, title, subtitle, badge, sections = [], actions }) {
  const closeRef = useRef(null)
  const returnTo = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (returnTo.current && document.contains(returnTo.current)) returnTo.current.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-label={title || 'Details'}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line/10 bg-surface shadow-2xl"
        >
          <div className="flex items-start gap-3 border-b border-line/10 px-6 py-5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-xl font-semibold text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-sm text-ink-3">{subtitle}</p>}
              {badge && <div className="mt-3">{badge}</div>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {sections
              .map((s) => ({ ...s, fields: s.fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== '') }))
              .filter((s) => s.fields.length > 0)
              .map((s) => (
                <section key={s.title}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">{s.title}</h3>
                  <dl className="mt-2 divide-y divide-line/5">
                    {s.fields.map((f) => (
                      <div key={f.label} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                        <dt className="shrink-0 text-ink-3">{f.label}</dt>
                        <dd className="min-w-0 break-words text-right font-medium text-ink">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
          </div>

          {actions && <div className="border-t border-line/10 px-6 py-4">{actions}</div>}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useRef } from 'react'
import { Link } from 'react-router-dom'

// A glass card with a soft light that follows the pointer.
// Pass `to` to make the whole card a link.
export default function SpotlightCard({ to, className = '', children }) {
  const ref = useRef(null)

  function onMouseMove(e) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  const classes =
    'group relative block overflow-hidden rounded-3xl border border-line/10 bg-surface/60 backdrop-blur-xl ' +
    'shadow-[0_1px_0_0_rgb(255_255_255/0.04)_inset] transition-all duration-300 hover:-translate-y-0.5 ' +
    'hover:border-line/20 ' +
    className

  const inner = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgb(var(--accent) / 0.16), transparent 45%)',
        }}
      />
      <span className="relative block h-full">{children}</span>
    </>
  )

  if (to) {
    return (
      <Link ref={ref} to={to} onMouseMove={onMouseMove} className={classes}>
        {inner}
      </Link>
    )
  }
  return (
    <div ref={ref} onMouseMove={onMouseMove} className={classes}>
      {inner}
    </div>
  )
}

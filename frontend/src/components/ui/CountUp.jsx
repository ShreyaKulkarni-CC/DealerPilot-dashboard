import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { fmt } from '../../lib/digest'

// A number that counts up the first time it scrolls into view, and glides
// to the new value when it changes. Shows the final value straight away for
// people who ask their system for reduced motion.
export default function CountUp({ value, duration = 1.1, format = fmt, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce && value != null ? value : 0)
  const from = useRef(reduce && value != null ? value : 0)

  useEffect(() => {
    if (value === null || value === undefined) return
    if (!inView) return
    if (reduce) {
      from.current = value
      setShown(value)
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        from.current = v
        setShown(v)
      },
    })
    return () => controls.stop()
  }, [value, inView, reduce, duration])

  if (value === null || value === undefined) return <span className={className}>—</span>
  return (
    <span ref={ref} className={className}>
      {format(Math.round(shown))}
    </span>
  )
}

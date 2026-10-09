import { motion } from 'framer-motion'

// Fades and lifts content in once, when it scrolls into view.
// Reduced-motion users get no movement (MotionConfig in App.jsx).
export default function Reveal({ children, delay = 0, y = 18, className }) {
  return (
    <motion.div
      className={`h-full ${className || ''}`}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

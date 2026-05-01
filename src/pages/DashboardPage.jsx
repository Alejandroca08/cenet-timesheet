import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { getGreeting, getCurrentMonthName } from '../lib/format'

export default function DashboardPage() {
  const { partner } = useAuth()
  const greeting = getGreeting()
  const month = getCurrentMonthName()

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="font-mono text-[11px] text-brown-light uppercase tracking-[0.15em] mb-1.5">
          {month} {new Date().getFullYear()}
        </p>
        <h1 className="font-heading text-[34px] font-light tracking-tight text-brown-dark">
          {greeting},{' '}
          <span className="font-bold">{partner?.full_name?.split(' ')[0]}</span>
        </h1>
        <div className="mt-4 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      {/* Stats, task list, sidebar — Phase 2 */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 rounded-card border border-brown-border bg-white p-8 text-center"
      >
        <p className="font-heading text-sm text-brown-light">
          El dashboard se construirá en la Fase 2.
        </p>
      </motion.div>
    </div>
  )
}

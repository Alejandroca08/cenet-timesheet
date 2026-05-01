import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function MonthlyTrend({ allStats, currentMonth }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 500)
    return () => clearTimeout(t)
  }, [])

  // Sort by year, month and take last 6 months max
  const sorted = [...allStats]
    .sort((a, b) => a.period_year - b.period_year || a.period_month - b.period_month)
    .slice(-6)

  if (sorted.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-card border border-brown-border bg-white p-5"
      >
        <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-4">
          Tendencia mensual
        </h3>
        <p className="text-center font-heading text-xs text-brown-light py-6">
          Sin datos
        </p>
      </motion.div>
    )
  }

  const maxHours = Math.max(...sorted.map(d => Number(d.total_hours)))
  const barMaxH = 80

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card border border-brown-border bg-white p-5"
    >
      <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-4">
        Tendencia mensual
      </h3>

      <div className="flex items-end gap-2.5" style={{ height: barMaxH + 28 }}>
        {sorted.map((d, i) => {
          const hours = Number(d.total_hours)
          const isLast = d.period_month === currentMonth
          const barH = maxHours > 0 ? (hours / maxHours) * barMaxH : 0

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <span
                className="font-mono text-[11px] font-medium transition-colors duration-300"
                style={{ color: isLast ? '#c96442' : '#8b7355' }}
              >
                {hours}h
              </span>
              <div className="relative w-full max-w-[38px]">
                <div
                  className="w-full rounded-[5px]"
                  style={{
                    backgroundColor: isLast ? '#c96442' : '#e2d5c5',
                    height: animated ? barH : 0,
                    transition: `height 0.85s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.1}s`,
                  }}
                />
              </div>
              <span className="text-[11px] text-brown-light font-medium tracking-wide">
                {MONTH_NAMES[d.period_month - 1]}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const PROJECT_COLORS = {
  FacturasApp: '#c96442',
  MiPlanilla:  '#5b8a72',
  MiNomina:    '#8b7355',
  MisFacturas: '#6b7b8d',
  MiPlataforma:'#a09484',
  Propensar:   '#c9b99a',
}

export default function ProjectDonut({ hoursByProject }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400)
    return () => clearTimeout(t)
  }, [])

  const data = Object.entries(hoursByProject || {}).map(([name, hours]) => ({
    name,
    hours: Number(hours),
    color: PROJECT_COLORS[name] || '#a09484',
  }))

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-card border border-brown-border bg-white p-5"
      >
        <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-4">
          Horas por proyecto
        </h3>
        <p className="text-center font-heading text-xs text-brown-light py-6">
          Sin datos
        </p>
      </motion.div>
    )
  }

  const total = data.reduce((s, d) => s + d.hours, 0)
  const size = 120
  const strokeW = 10
  const r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card border border-brown-border bg-white p-5 flex flex-col items-center"
    >
      <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-4 self-start">
        Horas por proyecto
      </h3>

      {/* Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0e8dc" strokeWidth={strokeW} />
          {data.map((d, i) => {
            const pct = d.hours / total
            const dash = circ * pct
            const gap = circ - dash
            const thisOffset = offset
            offset += dash
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeDasharray={`${animated ? dash - 3 : 0} ${animated ? gap + 3 : circ}`}
                strokeDashoffset={-thisOffset}
                style={{ transition: `stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1) ${i * 0.15}s` }}
              />
            )
          })}
        </svg>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="font-mono text-xl font-medium text-brown-dark">{total}</div>
          <div className="text-[10px] text-brown-light font-medium tracking-widest">HORAS</div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 w-full flex flex-col gap-1.5">
        {data.map((p, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-heading text-xs text-brown-warm">{p.name}</span>
            </div>
            <span className="font-mono text-xs font-medium text-brown-dark">{p.hours}h</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

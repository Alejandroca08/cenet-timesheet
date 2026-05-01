import { motion } from 'framer-motion'
import { formatCOP } from '../../lib/format'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}

export default function StatsRow({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-7">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`rounded-[14px] px-[18px] py-5 ${
              i === 3 ? 'bg-brown-dark' : 'bg-white border border-brown-border'
            }`}
          >
            <div className={`h-3 w-16 rounded animate-pulse mb-3 ${i === 3 ? 'bg-brown-warm/30' : 'bg-brown-hover'}`} />
            <div className={`h-6 w-24 rounded animate-pulse ${i === 3 ? 'bg-brown-warm/20' : 'bg-brown-hover'}`} />
          </div>
        ))}
      </div>
    )
  }

  const totalHours = stats?.total_hours ?? 0
  const grossIncome = stats?.gross_income ?? 0
  const retencion = stats?.retencion_amount ?? 0
  const takeHome = stats?.take_home ?? 0

  const cards = [
    { label: 'Horas', value: `${totalHours}h`, featured: false },
    { label: 'Ingreso bruto', value: formatCOP(grossIncome), featured: false },
    { label: 'Retención (11%)', value: formatCOP(retencion), featured: false },
    { label: 'Neto estimado', value: formatCOP(takeHome), featured: true },
  ]

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-7"
    >
      {cards.map((card) => (
        <motion.div
          key={card.label}
          variants={item}
          className={`rounded-[14px] px-[18px] py-5 cursor-default transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] ${
            card.featured
              ? 'bg-brown-dark hover:shadow-[0_12px_32px_rgba(44,36,24,0.25)]'
              : 'bg-white border border-brown-border hover:shadow-[0_8px_24px_rgba(44,36,24,0.07)]'
          }`}
        >
          <p
            className={`font-heading text-[11px] uppercase tracking-[1.5px] font-medium mb-2.5 ${
              card.featured ? 'text-brown-light' : 'text-brown-light'
            }`}
          >
            {card.label}
          </p>
          <p
            className={`font-mono text-xl font-medium ${
              card.featured ? 'text-cream' : 'text-brown-dark'
            }`}
          >
            {card.value}
          </p>
        </motion.div>
      ))}
    </motion.div>
  )
}

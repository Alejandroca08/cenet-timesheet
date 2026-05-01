import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { formatDateShort } from '../../lib/format'
import NudgeButton from './NudgeButton'

const STATUS_CONFIG = {
  in_progress: { label: 'En progreso', className: 'bg-gold-bg text-gold-muted border-gold-muted/10' },
  ready:       { label: 'Listo',       className: 'bg-sage/10 text-sage border-sage/10' },
  sent:        { label: 'Enviado',     className: 'bg-slate/10 text-slate border-slate/10' },
}

export default function TeamReadiness({ partners, loading, onNudge }) {
  const readyCount = partners.filter(p => p.period_status === 'ready').length
  const pendingCount = partners.filter(p => p.period_status === 'in_progress').length
  const sentCount = partners.filter(p => p.period_status === 'sent').length

  if (loading) {
    return (
      <div className="rounded-card border border-brown-border bg-white overflow-hidden">
        <div className="border-b border-brown-hover px-6 py-3.5">
          <div className="h-4 w-40 animate-pulse rounded bg-brown-hover" />
        </div>
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-32 animate-pulse rounded bg-brown-hover" />
              <div className="h-4 w-12 animate-pulse rounded bg-brown-hover" />
              <div className="h-4 w-12 animate-pulse rounded bg-brown-hover" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-brown-hover" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card border border-brown-border bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brown-hover px-6 py-3.5">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-brown-light" />
          <h3 className="font-heading text-sm font-semibold text-brown-dark">
            Estado del equipo
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {readyCount > 0 && (
            <span className="rounded-full bg-sage/10 px-2 py-0.5 font-mono text-[10px] font-medium text-sage">
              {readyCount} listo{readyCount !== 1 ? 's' : ''}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="rounded-full bg-gold-bg px-2 py-0.5 font-mono text-[10px] font-medium text-gold-muted">
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
          {sentCount > 0 && (
            <span className="rounded-full bg-slate/10 px-2 py-0.5 font-mono text-[10px] font-medium text-slate">
              {sentCount} enviado{sentCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {partners.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-heading text-sm text-brown-light">
            No hay socios activos registrados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brown-hover bg-cream/50">
                <th className="px-6 py-2 text-left font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Nombre</th>
                <th className="px-4 py-2 text-right font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Horas</th>
                <th className="px-4 py-2 text-right font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Tareas</th>
                <th className="px-4 py-2 text-center font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Estado</th>
                <th className="px-4 py-2 text-left font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Listo desde</th>
                <th className="px-4 py-2 text-center font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Acción</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const noActivity = !p.period_status
                const status = STATUS_CONFIG[p.period_status]

                return (
                  <tr
                    key={p.partner_id}
                    className={`border-b border-brown-hover/50 last:border-b-0 transition-colors ${
                      noActivity ? 'bg-cream/30' : 'hover:bg-cream/30'
                    }`}
                  >
                    <td className="px-6 py-2.5">
                      <span className={`font-heading text-sm ${noActivity ? 'text-brown-light' : 'text-brown-dark font-medium'}`}>
                        {p.full_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-mono text-xs ${noActivity ? 'text-brown-light' : 'text-terracotta font-medium'}`}>
                        {p.total_hours > 0 ? `${p.total_hours}h` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`font-mono text-xs ${noActivity ? 'text-brown-light' : 'text-brown-dark'}`}>
                        {p.task_count > 0 ? p.task_count : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {status ? (
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 font-heading text-[10px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      ) : (
                        <span className="inline-block rounded-full border border-brown-border px-2.5 py-0.5 font-heading text-[10px] text-brown-light">
                          Sin actividad
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[11px] text-brown-light">
                        {p.marked_ready_at ? formatDateShort(p.marked_ready_at) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {p.period_status === 'in_progress' && (
                        <NudgeButton
                          partnerId={p.partner_id}
                          onNudge={onNudge}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  )
}

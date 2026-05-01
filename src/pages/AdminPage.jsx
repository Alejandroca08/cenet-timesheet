import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, CheckCircle, Clock, Send } from 'lucide-react'
import { useAdmin } from '../hooks/useAdmin'
import { formatRelativeTime } from '../lib/format'
import TeamReadiness from '../components/admin/TeamReadiness'
import BatchSendButton from '../components/admin/BatchSendButton'

const MONTH_NAMES = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

const AUDIT_LABELS = {
  task_created: 'Creó una tarea',
  task_updated: 'Editó una tarea',
  task_deleted: 'Eliminó una tarea',
  excel_uploaded: 'Subió Excel',
  invoice_generated: 'Generó cuenta de cobro',
  invoice_sent: 'Envió cuenta de cobro',
  rate_changed: 'Cambió tarifa',
  period_marked_ready: 'Marcó como listo',
  period_sent: 'Período enviado',
  attachment_uploaded: 'Subió planilla',
  oauth_connected: 'Conectó email',
  oauth_revoked: 'Desconectó email',
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
}

export default function AdminPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const { partners, auditLog, loading, error, sendNudge, batchSend } = useAdmin(selectedYear, selectedMonth)

  const readyCount = partners.filter(p => p.period_status === 'ready').length
  const pendingCount = partners.filter(p => p.period_status === 'in_progress').length
  const sentCount = partners.filter(p => p.period_status === 'sent').length
  const totalPartners = partners.length

  const stats = [
    { label: 'Total socios', value: totalPartners, icon: Users, color: 'text-brown-dark' },
    { label: 'Listos', value: readyCount, icon: CheckCircle, color: 'text-sage', featured: true },
    { label: 'Pendientes', value: pendingCount, icon: Clock, color: 'text-gold-muted' },
    { label: 'Enviados', value: sentCount, icon: Send, color: 'text-slate' },
  ]

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <p className="font-mono text-[11px] text-brown-light uppercase tracking-[0.15em] mb-1.5">
          Administración
        </p>
        <h1 className="font-heading text-[34px] font-light tracking-tight text-brown-dark">
          Estado del <span className="font-bold">equipo</span>
        </h1>
        <div className="mt-4 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      {/* Summary cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mb-6 grid grid-cols-4 gap-3"
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            className={`rounded-[14px] px-[18px] py-5 transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[3px] ${
              s.featured
                ? 'bg-brown-dark text-cream shadow-[0_6px_20px_rgba(44,36,24,0.2)] hover:shadow-[0_12px_32px_rgba(44,36,24,0.25)]'
                : 'bg-white border border-brown-border hover:shadow-[0_8px_24px_rgba(44,36,24,0.07)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.featured ? 'text-cream/60' : s.color} />
              <p className={`font-heading text-[11px] uppercase tracking-[1.5px] ${
                s.featured ? 'text-cream/60' : 'text-brown-light'
              }`}>
                {s.label}
              </p>
            </div>
            <p className={`font-mono text-xl font-medium ${
              s.featured ? 'text-cream' : s.color
            }`}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 font-heading text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_300px] gap-5">
        {/* Left: Team readiness table */}
        <TeamReadiness
          partners={partners}
          loading={loading}
          onNudge={sendNudge}
        />

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Period selector */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
                Período
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedYear(y => y - 1)}
                  className="rounded-md px-1.5 py-0.5 font-mono text-xs text-brown-light hover:bg-brown-hover transition-colors"
                >
                  ‹
                </button>
                <span className="font-mono text-xs text-brown-dark font-medium px-1">
                  {selectedYear}
                </span>
                <button
                  onClick={() => setSelectedYear(y => y + 1)}
                  className="rounded-md px-1.5 py-0.5 font-mono text-xs text-brown-light hover:bg-brown-hover transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`rounded-lg px-2 py-1.5 font-heading text-[11px] font-medium transition-all duration-200 ${
                    selectedMonth === month
                      ? 'bg-brown-dark text-cream'
                      : 'bg-cream text-brown-warm hover:bg-brown-hover'
                  }`}
                >
                  {MONTH_NAMES[month]}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Batch send */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
              Envío masivo
            </h3>
            {readyCount > 0 ? (
              <p className="font-heading text-[11px] text-brown-light mb-3">
                {readyCount} socio{readyCount !== 1 ? 's' : ''} listo{readyCount !== 1 ? 's' : ''} para enviar en {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </p>
            ) : (
              <p className="font-heading text-[11px] text-brown-light mb-3">
                Ningún socio ha marcado su período como listo.
              </p>
            )}
            <BatchSendButton
              readyCount={readyCount}
              onBatchSend={batchSend}
              disabled={loading}
            />
          </motion.div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
              Actividad reciente
            </h3>
            {auditLog.length === 0 ? (
              <p className="font-heading text-[11px] text-brown-light">
                Sin actividad registrada.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {auditLog.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 rounded-lg bg-cream/50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-[11px] text-brown-dark">
                        <span className="font-semibold">{entry.partners?.full_name ?? 'Sistema'}</span>
                        {' '}
                        <span className="text-brown-light">
                          {AUDIT_LABELS[entry.action] ?? entry.action}
                        </span>
                      </p>
                      <p className="font-mono text-[10px] text-brown-light mt-0.5">
                        {formatRelativeTime(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

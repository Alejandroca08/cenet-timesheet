import { motion } from 'framer-motion'
import { formatCOP } from '../../lib/format'

export default function AportesCard({ stats }) {
  const ibc = stats?.ibc ?? 0
  const aportesSalud = stats?.aportes_salud ?? 0
  const aportesPension = stats?.aportes_pension ?? 0
  const aportesArl = stats?.aportes_arl ?? 0
  const planillaTotal = stats?.planilla_total ?? 0
  const aportesRequired = stats?.aportes_required ?? false

  const rows = [
    { label: 'IBC (40%)', value: formatCOP(ibc) },
    { label: 'Salud', pct: '12.5%', value: formatCOP(aportesSalud), color: '#5b8a72' },
    { label: 'Pensión', pct: '16%', value: formatCOP(aportesPension), color: '#c96442' },
    { label: 'ARL', pct: '0.52%', value: formatCOP(aportesArl), color: '#8b7355' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card border border-brown-border bg-white p-5"
    >
      <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3.5">
        Seguridad social
      </h3>

      <div className="flex flex-col gap-2.5">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {item.color && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              )}
              <span className="font-heading text-xs text-brown-warm">
                {item.label}{' '}
                {item.pct && (
                  <span className="text-brown-light/50">({item.pct})</span>
                )}
              </span>
            </div>
            <span className="font-mono text-xs font-medium text-brown-dark">
              {item.value}
            </span>
          </div>
        ))}

        <div className="h-px bg-brown-border my-1" />

        <div className="flex items-center justify-between">
          <span className="font-heading text-[13px] font-semibold text-brown-dark">
            Planilla total
          </span>
          <span className="font-mono text-[15px] font-medium text-terracotta">
            {formatCOP(planillaTotal)}
          </span>
        </div>
      </div>

      {/* Warning banner */}
      {aportesRequired && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-[10px] border border-gold-muted/10 bg-gold-bg px-3.5 py-2.5">
          <span className="text-[13px] leading-none mt-0.5 text-gold-muted">&#9888;</span>
          <span className="font-heading text-[11px] leading-relaxed text-gold-muted">
            Tu ingreso supera 1 SMLMV. Recuerda subir tu planilla de seguridad social antes de enviar.
          </span>
        </div>
      )}
    </motion.div>
  )
}

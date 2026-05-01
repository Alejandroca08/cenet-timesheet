import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, User, Building2, CreditCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { formatCOP } from '../../lib/format'

const BANK_TYPES = ['Ahorros', 'Corriente']

const inputClass =
  'w-full rounded-xl border border-brown-border bg-white px-4 py-2.5 font-body text-sm text-brown-dark outline-none transition-colors focus:border-terracotta focus:ring-1 focus:ring-terracotta/20'
const labelClass =
  'block font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light mb-1.5'

export default function ProfileForm({ partner, onSaved }) {
  const { session } = useAuth()
  const [form, setForm] = useState({
    full_name: partner?.full_name ?? '',
    cc_number: partner?.cc_number ?? '',
    cc_issued_in: partner?.cc_issued_in ?? '',
    hourly_rate: partner?.hourly_rate ?? 0,
    bank_name: partner?.bank_name ?? '',
    bank_account_type: partner?.bank_account_type ?? 'Ahorros',
    bank_account_number: partner?.bank_account_number ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { error: updateError } = await supabase
        .from('partners')
        .update({
          full_name: form.full_name.trim(),
          cc_number: form.cc_number.trim(),
          cc_issued_in: form.cc_issued_in.trim(),
          hourly_rate: Number(form.hourly_rate),
          bank_name: form.bank_name.trim(),
          bank_account_type: form.bank_account_type,
          bank_account_number: form.bank_account_number.trim(),
        })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      // Log rate change if it changed
      if (Number(form.hourly_rate) !== partner?.hourly_rate) {
        await supabase.from('audit_log').insert({
          partner_id: session.user.id,
          action: 'rate_changed',
          details: {
            old_rate: partner?.hourly_rate,
            new_rate: Number(form.hourly_rate),
          },
        })
      }

      setSuccess(true)
      if (onSaved) onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal info section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-terracotta" />
          <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
            Datos personales
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Nombre completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Cédula (CC)</label>
            <input
              type="text"
              value={form.cc_number}
              onChange={(e) => update('cc_number', e.target.value)}
              placeholder="1234567890"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Expedida en</label>
            <input
              type="text"
              value={form.cc_issued_in}
              onChange={(e) => update('cc_issued_in', e.target.value)}
              placeholder="Bogotá"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Rate section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-terracotta" />
          <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
            Tarifa
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tarifa por hora (COP)</label>
            <input
              type="number"
              min="0"
              step="500"
              value={form.hourly_rate}
              onChange={(e) => update('hourly_rate', e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2.5">
            <span className="font-mono text-sm text-brown-light">
              = {formatCOP(Number(form.hourly_rate))}/h
            </span>
          </div>
        </div>
        <p className="mt-1.5 font-heading text-[10px] text-brown-light">
          Cuenta #{partner?.invoice_counter ?? 0} generada hasta ahora
        </p>
      </div>

      {/* Bank section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-terracotta" />
          <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
            Datos bancarios
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Banco</label>
            <input
              type="text"
              value={form.bank_name}
              onChange={(e) => update('bank_name', e.target.value)}
              placeholder="Bancolombia"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de cuenta</label>
            <select
              value={form.bank_account_type}
              onChange={(e) => update('bank_account_type', e.target.value)}
              className={inputClass}
            >
              {BANK_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Número de cuenta</label>
            <input
              type="text"
              value={form.bank_account_number}
              onChange={(e) => update('bank_account_number', e.target.value)}
              placeholder="12345678901"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Feedback + submit */}
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 font-heading text-xs text-red-600">
          {error}
        </div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-sage/10 px-4 py-2.5 font-heading text-xs text-sage"
        >
          Perfil actualizado correctamente
        </motion.div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-brown-dark px-6 py-2.5 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20 disabled:opacity-50"
      >
        <Save size={15} />
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

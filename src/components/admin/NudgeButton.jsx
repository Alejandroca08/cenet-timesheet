import { useState } from 'react'
import { Bell, Check } from 'lucide-react'

export default function NudgeButton({ partnerId, onNudge, disabled }) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await onNudge(partnerId)
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      alert('Error al enviar recordatorio: ' + (err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <span className="flex items-center gap-1 rounded-lg bg-sage/10 px-3 py-1.5 font-heading text-[11px] font-medium text-sage">
        <Check size={11} /> Enviado
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 rounded-lg border border-terracotta/20 px-3 py-1.5 font-heading text-[11px] font-medium text-terracotta transition-all hover:bg-terracotta/5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Bell size={11} />
      {loading ? 'Enviando...' : 'Recordar'}
    </button>
  )
}

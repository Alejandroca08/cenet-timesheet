import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Check } from 'lucide-react'
import { useToast } from '../../lib/toast'

export default function BatchSendButton({ readyCount, onBatchSend, disabled }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSend() {
    setLoading(true)
    try {
      const affected = await onBatchSend()
      setResult(affected)
      setConfirming(false)
      setTimeout(() => setResult(null), 4000)
    } catch (err) {
      toast.error('Error al enviar: ' + (err.message || String(err)))
      setConfirming(false)
    } finally {
      setLoading(false)
    }
  }

  if (result !== null) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full rounded-[14px] bg-sage/10 px-5 py-[15px] text-center"
      >
        <span className="flex items-center justify-center gap-2 font-heading text-sm font-semibold text-sage">
          <Check size={16} />
          {result} socio{result !== 1 ? 's' : ''} marcado{result !== 1 ? 's' : ''} como enviado{result !== 1 ? 's' : ''}
        </span>
      </motion.div>
    )
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="font-heading text-xs text-brown-dark text-center">
          Se marcarán <span className="font-semibold">{readyCount}</span> cuenta{readyCount !== 1 ? 's' : ''} como enviada{readyCount !== 1 ? 's' : ''}. ¿Continuar?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="flex-1 rounded-xl border border-brown-border px-4 py-2.5 font-heading text-sm font-medium text-brown-warm transition-colors hover:bg-brown-hover disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex-1 rounded-xl bg-terracotta px-4 py-2.5 font-heading text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled || readyCount === 0}
      className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-terracotta px-5 py-[15px] font-heading text-sm font-semibold tracking-wide text-white shadow-[0_4px_16px_rgba(201,100,66,0.25)] transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] hover:shadow-[0_8px_24px_rgba(201,100,66,0.3)] disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
    >
      <Send size={15} />
      Enviar todo ({readyCount})
    </button>
  )
}

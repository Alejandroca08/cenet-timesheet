import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function ReadyButton({ status, hasTasks, onMarkReady, onUnmarkReady }) {
  const [loading, setLoading] = useState(false)
  const isReady = status === 'ready'
  const isSent = status === 'sent'
  const disabled = isSent || loading || (!isReady && !hasTasks)

  async function handleClick() {
    setLoading(true)
    try {
      if (isReady) {
        await onUnmarkReady()
      } else {
        await onMarkReady()
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Error al actualizar el estado: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full rounded-[14px] px-5 py-[15px] font-heading text-sm font-semibold tracking-wide text-cream transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[2px] disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed ${
          isSent
            ? 'bg-slate shadow-[0_4px_16px_rgba(107,123,141,0.25)]'
            : isReady
              ? 'bg-sage shadow-[0_4px_16px_rgba(91,138,114,0.25)] hover:shadow-[0_8px_24px_rgba(91,138,114,0.3)]'
              : 'bg-brown-dark shadow-[0_4px_16px_rgba(44,36,24,0.2)] hover:shadow-[0_8px_24px_rgba(44,36,24,0.25)]'
        }`}
      >
        {loading ? (
          'Actualizando...'
        ) : isSent ? (
          <span className="flex items-center justify-center gap-2">
            <Check size={16} /> Enviado
          </span>
        ) : isReady ? (
          <span className="flex items-center justify-center gap-2">
            <Check size={16} /> Marcado como listo
          </span>
        ) : (
          'Marcar como listo'
        )}
      </button>

      {!hasTasks && !isReady && !isSent && (
        <p className="mt-2 text-center font-heading text-[10px] text-brown-light">
          Agrega al menos una tarea para habilitar
        </p>
      )}
    </motion.div>
  )
}

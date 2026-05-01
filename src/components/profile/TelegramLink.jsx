import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, Check, Copy, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export default function TelegramLink({ partner, onLinked }) {
  const { session } = useAuth()
  const toast = useToast()
  const isLinked = !!partner?.telegram_chat_id
  const [code, setCode] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  async function handleGenerateCode() {
    setGenerating(true)
    try {
      const newCode = generateCode()

      // Store the verification code temporarily in the partner record
      const { error } = await supabase
        .from('partners')
        .update({ telegram_verification_code: newCode })
        .eq('id', session.user.id)

      if (error) throw error
      setCode(newCode)
    } catch (err) {
      toast.error('Error al generar código: ' + (err.message || String(err)))
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleUnlink() {
    setUnlinking(true)
    try {
      const { error } = await supabase
        .from('partners')
        .update({ telegram_chat_id: null })
        .eq('id', session.user.id)

      if (error) throw error
      if (onLinked) onLinked()
    } catch (err) {
      toast.error('Error al desvincular: ' + (err.message || String(err)))
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle size={16} className="text-terracotta" />
        <h3 className="font-heading text-[13px] font-semibold text-brown-dark">
          Telegram
        </h3>
      </div>

      {isLinked ? (
        <div className="rounded-xl border border-sage/20 bg-sage/5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full bg-sage/10 px-2.5 py-0.5 font-heading text-[10px] font-medium text-sage">
                <Check size={11} /> Vinculado
              </span>
              <span className="font-mono text-[11px] text-brown-light">
                Chat ID: {partner.telegram_chat_id}
              </span>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="rounded-lg px-3 py-1 font-heading text-[11px] text-brown-light hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {unlinking ? 'Desvinculando...' : 'Desvincular'}
            </button>
          </div>
          <p className="mt-2 font-heading text-[11px] text-brown-light">
            Recibirás notificaciones y podrás registrar tareas por Telegram.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-heading text-[11px] text-brown-light">
            Vincula tu cuenta de Telegram para recibir recordatorios y registrar tareas por chat.
          </p>

          {!code ? (
            <button
              onClick={handleGenerateCode}
              disabled={generating}
              className="flex items-center gap-2 rounded-xl bg-[#229ED9] px-4 py-2.5 font-heading text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
            >
              <MessageCircle size={15} />
              {generating ? 'Generando...' : 'Generar código de verificación'}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-brown-border bg-cream/50 px-4 py-4 space-y-3"
            >
              <div className="text-center">
                <p className="font-heading text-[11px] text-brown-light mb-2">
                  Tu código de verificación:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-2xl font-bold tracking-[0.3em] text-brown-dark">
                    {code}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="rounded-lg p-1.5 text-brown-light hover:bg-brown-hover hover:text-brown-dark transition-colors"
                    title="Copiar código"
                  >
                    {copied ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-brown-border" />

              <div className="space-y-2">
                <p className="font-heading text-[11px] font-semibold text-brown-dark">
                  Instrucciones:
                </p>
                <ol className="space-y-1.5 font-heading text-[11px] text-brown-light list-decimal pl-4">
                  <li>Abre Telegram y busca el bot <span className="font-mono text-brown-dark">@CenetTimesheetBot</span></li>
                  <li>Envía el comando <span className="font-mono text-brown-dark">/verificar {code}</span></li>
                  <li>El bot confirmará la vinculación</li>
                </ol>
              </div>

              <button
                onClick={handleGenerateCode}
                disabled={generating}
                className="flex items-center gap-1.5 font-heading text-[11px] text-brown-light hover:text-terracotta transition-colors disabled:opacity-50"
              >
                <RefreshCw size={11} />
                Generar nuevo código
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

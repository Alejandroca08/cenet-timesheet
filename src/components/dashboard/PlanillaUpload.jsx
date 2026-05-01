import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useToast } from '../../lib/toast'

export default function PlanillaUpload({ year, month, periodId, onUploaded }) {
  const toast = useToast()
  const { session } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [fileName, setFileName] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.pdf')) {
      toast.error('Solo se permiten archivos PDF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar 5MB')
      return
    }

    setUploading(true)
    try {
      const path = `${session.user.id}/${year}-${month}/planilla.pdf`

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      // If there's a period, save the attachment reference
      if (periodId) {
        await supabase.from('partner_period_attachments').insert({
          partner_period_id: periodId,
          attachment_type: 'planilla_seguridad_social',
          file_url: path,
          file_name: file.name,
        })
      }

      setUploaded(true)
      setFileName(file.name)
      onUploaded?.(path)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Error al subir el archivo: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        onClick={() => !uploaded && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`rounded-[14px] border-2 border-dashed px-[18px] py-4 text-center cursor-pointer transition-all duration-200 ${
          uploaded
            ? 'border-sage/40 bg-sage/5'
            : dragOver
              ? 'border-terracotta bg-terracotta/[0.03]'
              : 'border-brown-border bg-white/50 hover:border-terracotta hover:bg-terracotta/[0.03]'
        }`}
      >
        {uploaded ? (
          <div className="flex items-center justify-center gap-2">
            <FileCheck size={16} className="text-sage" />
            <span className="font-heading text-[13px] text-sage font-medium">
              {fileName}
            </span>
          </div>
        ) : uploading ? (
          <p className="font-heading text-[13px] text-brown-light">
            Subiendo...
          </p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Upload size={14} className="text-brown-light" />
              <p className="font-heading text-[13px] text-brown-light">
                Subir planilla de seguridad social
              </p>
            </div>
            <p className="font-mono text-[10px] text-brown-light/60">
              PDF · Máx 5MB
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </motion.div>
  )
}

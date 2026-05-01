import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileText, Download, Eye } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useInvoices } from '../hooks/useInvoices'
import { formatCOP } from '../lib/format'
import { amountToWords } from '../lib/number-to-words-es'
import InvoicePreview from '../components/invoice/InvoicePreview'

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function InvoicePage() {
  const { partner } = useAuth()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear] = useState(currentYear)
  const [selectedMonths, setSelectedMonths] = useState([currentMonth])
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedInvoice, setGeneratedInvoice] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const previewRef = useRef(null)

  const { invoices, generateInvoice, uploadPdf } = useInvoices()

  // Fetch hours directly from tasks table for selected months (always fresh)
  const [totalHours, setTotalHours] = useState(0)
  const [projectNames, setProjectNames] = useState('')
  const [loadingPeriod, setLoadingPeriod] = useState(true)

  const fetchPeriodData = useCallback(async () => {
    setLoadingPeriod(true)
    // Query by period_month (consistent with dashboard and materialized view)
    let query = supabase
      .from('tasks')
      .select('hours, projects(name)')
      .eq('period_year', selectedYear)

    // Support multi-month invoices
    if (selectedMonths.length === 1) {
      query = query.eq('period_month', selectedMonths[0])
    } else {
      query = query.in('period_month', selectedMonths)
    }

    const { data } = await query

    if (!data) { setTotalHours(0); setProjectNames(''); setLoadingPeriod(false); return }

    const hours = data.reduce((sum, t) => sum + Number(t.hours), 0)
    const projects = [...new Set(data.map(t => t.projects?.name).filter(Boolean))]
    setTotalHours(hours)
    setProjectNames(projects.join(', '))
    setLoadingPeriod(false)
  }, [selectedYear, selectedMonths])

  useEffect(() => { fetchPeriodData() }, [fetchPeriodData])

  const hourlyRate = partner?.hourly_rate ?? 0
  const totalAmount = totalHours * hourlyRate

  function toggleMonth(month) {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    )
    setGeneratedInvoice(null)
    setShowPreview(false)
  }

  function handlePreview() {
    if (totalHours <= 0) {
      setError('No hay horas registradas para el período seleccionado.')
      return
    }
    if (hourlyRate <= 0) {
      setError('No tienes una tarifa por hora configurada. Ve a Perfil para configurarla.')
      return
    }
    setError(null)

    // Build a preview invoice object
    const sortedMonths = [...selectedMonths].sort((a, b) => a - b)
    const firstMonth = sortedMonths[0]
    const lastMonth = sortedMonths[sortedMonths.length - 1]
    const lastDay = new Date(selectedYear, lastMonth, 0).getDate()

    setGeneratedInvoice({
      invoice_number: (partner?.invoice_counter ?? 0) + 1,
      period_start_date: `${selectedYear}-${String(firstMonth).padStart(2, '0')}-01`,
      period_end_date: `${selectedYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      total_amount: totalAmount,
      total_amount_words: amountToWords(totalAmount),
    })
    setShowPreview(true)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const invoice = await generateInvoice({
        year: selectedYear,
        months: selectedMonths,
        totalHours,
        hourlyRate,
      })
      setGeneratedInvoice(invoice)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleDownloadPdf() {
    if (!previewRef.current) return
    setDownloading(true)

    try {
      const html2pdf = (await import('html2pdf.js')).default

      const opt = {
        margin: 0,
        filename: `cuenta_cobro_${generatedInvoice.invoice_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }

      const pdfBlob = await html2pdf().set(opt).from(previewRef.current).outputPdf('blob')

      // Upload to Supabase Storage if invoice has an id (was saved)
      if (generatedInvoice.id) {
        await uploadPdf(
          generatedInvoice.id,
          generatedInvoice.invoice_number,
          pdfBlob,
          selectedYear,
          selectedMonths[0]
        )
      }

      // Also trigger browser download
      await html2pdf().set(opt).from(previewRef.current).save()
    } catch (err) {
      setError('Error al generar el PDF: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  // Past invoices
  const pastInvoices = invoices.filter(inv => inv.id !== generatedInvoice?.id)

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-semibold text-brown-dark">
          Cuenta de cobro
        </h1>
        <p className="mt-1 font-heading text-sm text-brown-light">
          Genera y descarga tu cuenta de cobro para el período seleccionado.
        </p>
        <div className="mt-3 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Left: Preview or placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {showPreview && generatedInvoice ? (
            <div className="rounded-card border border-brown-border overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brown-hover bg-cream/50 px-4 sm:px-6 py-3">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-brown-light" />
                  <span className="font-heading text-sm font-medium text-brown-dark">
                    Vista previa
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!generatedInvoice.id && (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="rounded-lg bg-brown-dark px-4 py-1.5 font-heading text-xs font-semibold text-cream transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                    >
                      {generating ? 'Generando...' : 'Guardar cuenta'}
                    </button>
                  )}
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="flex items-center gap-1.5 rounded-lg bg-terracotta px-4 py-1.5 font-heading text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                  >
                    <Download size={13} />
                    {downloading ? 'Descargando...' : 'Descargar PDF'}
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[800px] bg-gray-100 p-6">
                <div className="shadow-lg">
                  <InvoicePreview
                    ref={previewRef}
                    invoice={generatedInvoice}
                    partner={partner}
                    projectNames={projectNames}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-brown-border bg-white px-8 py-16 text-center">
              <FileText size={40} className="mx-auto mb-3 text-brown-border" />
              <p className="font-heading text-sm text-brown-light">
                Selecciona un período y haz clic en "Vista previa" para ver tu cuenta de cobro.
              </p>
            </div>
          )}
        </motion.div>

        {/* Right: Controls + past invoices */}
        <div className="flex flex-col gap-4">
          {/* Period selector */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
              Período — {selectedYear}
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={`rounded-lg px-2 py-1.5 font-heading text-[11px] font-medium transition-all duration-200 ${
                    selectedMonths.includes(month)
                      ? 'bg-brown-dark text-cream'
                      : 'bg-cream text-brown-warm hover:bg-brown-hover'
                  }`}
                >
                  {MONTH_NAMES[month].substring(0, 3)}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-card border border-brown-border bg-white p-5"
          >
            <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
              Resumen
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Meses</span>
                <span className="font-mono text-xs text-brown-dark font-medium">
                  {selectedMonths.map(m => MONTH_NAMES[m].substring(0, 3)).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Horas</span>
                {loadingPeriod ? (
                  <span className="h-4 w-10 animate-pulse rounded bg-brown-hover" />
                ) : (
                  <span className="font-mono text-xs text-brown-dark font-medium">{totalHours}h</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="font-heading text-xs text-brown-warm">Tarifa</span>
                <span className="font-mono text-xs text-brown-dark font-medium">{formatCOP(hourlyRate)}/h</span>
              </div>
              <div className="h-px bg-brown-border my-1" />
              <div className="flex justify-between">
                <span className="font-heading text-[13px] font-semibold text-brown-dark">Total</span>
                {loadingPeriod ? (
                  <span className="h-5 w-24 animate-pulse rounded bg-brown-hover" />
                ) : (
                  <span className="font-mono text-[15px] font-medium text-terracotta">{formatCOP(totalAmount)}</span>
                )}
              </div>
            </div>

            <button
              onClick={handlePreview}
              disabled={totalHours <= 0}
              className="mt-4 w-full rounded-xl bg-brown-dark px-4 py-2.5 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              Vista previa
            </button>
          </motion.div>

          {/* Past invoices */}
          {pastInvoices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-card border border-brown-border bg-white p-5"
            >
              <h3 className="font-heading text-[13px] font-semibold text-brown-dark mb-3">
                Cuentas anteriores
              </h3>
              <div className="space-y-2">
                {pastInvoices.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg bg-cream/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-brown-light" />
                      <div>
                        <p className="font-heading text-xs font-medium text-brown-dark">
                          #{inv.invoice_number}
                        </p>
                        <p className="font-mono text-[10px] text-brown-light">
                          {formatCOP(inv.total_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {inv.sent_at ? (
                        <span className="rounded-full bg-sage/10 px-2 py-0.5 font-heading text-[10px] font-medium text-sage">
                          Enviada
                        </span>
                      ) : (
                        <span className="rounded-full bg-gold-bg px-2 py-0.5 font-heading text-[10px] font-medium text-gold-muted">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 font-heading text-xs text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

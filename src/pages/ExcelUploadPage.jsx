import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, Check, X, AlertTriangle } from 'lucide-react'
import { parseExcel, getAvailableSheets } from '../lib/excel-parser'
import { useTasks } from '../hooks/useTasks'
import { formatDateShort } from '../lib/format'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function ExcelUploadPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { projects, bulkAddTasks } = useTasks(year, month)

  const [file, setFile] = useState(null)
  const [sheets, setSheets] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [parsedTasks, setParsedTasks] = useState([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setError(null)
    setParsedTasks([])
    setImported(false)

    try {
      const available = await getAvailableSheets(f)
      setSheets(available)

      // Auto-select current month if available
      const currentIdx = month - 1
      const currentSheet = available.find(s => s.monthIndex === currentIdx)
      if (currentSheet) {
        setSelectedMonth(currentIdx)
        await parseMonth(f, currentIdx)
      } else if (available.length > 0) {
        setSelectedMonth(available[0].monthIndex)
        await parseMonth(f, available[0].monthIndex)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function parseMonth(f, monthIdx) {
    setParsing(true)
    setError(null)
    try {
      const tasks = await parseExcel(f || file, monthIdx, projects)
      setParsedTasks(tasks)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      // selectedMonth is 0-based (monthIndex), period_month is 1-based
      await bulkAddTasks(parsedTasks, {
        periodYear: year,
        periodMonth: selectedMonth + 1,
      })
      setImported(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setFile(null)
    setSheets([])
    setSelectedMonth(null)
    setParsedTasks([])
    setImported(false)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const totalHours = parsedTasks.reduce((sum, t) => sum + t.hours, 0)
  const unmatchedCount = parsedTasks.filter(t => !t.project_id).length
  const missingHoursCount = parsedTasks.filter(t => !t.has_hours).length

  const updateTask = useCallback((index, field, value) => {
    setParsedTasks(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }

      if (field === 'hours') {
        updated[index].has_hours = Number(value) > 0
      }
      if (field === 'project_id') {
        const proj = projects.find(p => p.id === value)
        updated[index].project_name = proj ? proj.name : 'Sin proyecto'
      }
      return updated
    })
  }, [projects])

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-semibold text-brown-dark">
          Importar Excel
        </h1>
        <p className="mt-1 font-heading text-sm text-brown-light">
          Sube tu archivo de horas trabajadas para importar las tareas del mes.
        </p>
        <div className="mt-3 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      {/* Upload area */}
      {!file && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed px-8 py-16 cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-terracotta bg-terracotta/[0.03]'
                : 'border-brown-border bg-white/50 hover:border-terracotta hover:bg-terracotta/[0.03]'
            }`}
          >
            <Upload size={32} className="text-brown-light mb-3" />
            <p className="font-heading text-sm font-medium text-brown-dark">
              Arrastra tu archivo Excel o haz clic para seleccionar
            </p>
            <p className="mt-1 font-mono text-xs text-brown-light">
              .xlsx · plantillaHorasTrabajadas
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </motion.div>
      )}

      {/* File loaded — month selector + preview */}
      {file && !imported && (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* File info bar */}
          <div className="flex items-center justify-between rounded-xl border border-brown-border bg-white px-5 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={20} className="text-terracotta" />
              <div>
                <p className="font-heading text-sm font-medium text-brown-dark">{file.name}</p>
                <p className="font-mono text-[10px] text-brown-light">
                  {sheets.length} hojas de meses encontradas
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded-lg p-1.5 text-brown-light hover:bg-brown-hover hover:text-brown-dark transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Month tabs */}
          <div className="flex gap-2 flex-wrap">
            {sheets.map((s) => (
              <button
                key={s.monthIndex}
                onClick={() => { setSelectedMonth(s.monthIndex); parseMonth(file, s.monthIndex) }}
                className={`rounded-lg px-3.5 py-1.5 font-heading text-xs font-medium transition-all duration-200 ${
                  selectedMonth === s.monthIndex
                    ? 'bg-brown-dark text-cream'
                    : 'bg-white border border-brown-border text-brown-warm hover:bg-brown-hover'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Parsing spinner */}
          {parsing && (
            <div className="py-8 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brown-border border-t-terracotta" />
              <p className="mt-2 font-heading text-xs text-brown-light">Analizando...</p>
            </div>
          )}

          {/* Preview table */}
          {!parsing && parsedTasks.length > 0 && (
            <div className="rounded-card border border-brown-border bg-white overflow-hidden">
              <div className="flex items-center justify-between border-b border-brown-hover px-6 py-3.5">
                <h3 className="font-heading text-sm font-semibold text-brown-dark">
                  Vista previa — {MONTH_NAMES[selectedMonth]}
                </h3>
                <span className="font-mono text-xs text-brown-light">
                  {parsedTasks.length} tareas · {totalHours}h
                </span>
              </div>

              {(unmatchedCount > 0 || missingHoursCount > 0) && (
                <div className="flex items-center gap-3 bg-gold-bg px-6 py-2 border-b border-gold-muted/10">
                  <AlertTriangle size={13} className="text-gold-muted flex-shrink-0" />
                  <span className="font-heading text-[11px] text-gold-muted">
                    {[
                      unmatchedCount > 0 && `${unmatchedCount} sin proyecto`,
                      missingHoursCount > 0 && `${missingHoursCount} sin horas`,
                    ].filter(Boolean).join(' · ')}
                    {' — puedes editar antes de importar'}
                  </span>
                </div>
              )}

              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brown-hover bg-cream/50">
                      <th className="px-6 py-2 text-left font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Fecha</th>
                      <th className="px-4 py-2 text-left font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Proyecto</th>
                      <th className="px-4 py-2 text-left font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Descripción</th>
                      <th className="px-4 py-2 text-right font-heading text-[10px] font-medium uppercase tracking-wider text-brown-light">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTasks.map((t, i) => (
                      <tr
                        key={i}
                        className={`border-b border-brown-hover/50 last:border-b-0 transition-colors ${
                          !t.has_hours ? 'bg-gold-bg/30' : 'hover:bg-cream/30'
                        }`}
                      >
                        <td className="px-6 py-2 font-mono text-xs text-brown-dark">
                          {formatDateShort(t.task_date)}
                        </td>
                        <td className="px-4 py-1.5">
                          <select
                            value={t.project_id ?? ''}
                            onChange={(e) => updateTask(i, 'project_id', e.target.value || null)}
                            className={`w-full rounded-md border px-2 py-1 font-heading text-xs transition-colors ${
                              t.project_id
                                ? 'border-brown-border bg-white text-brown-dark'
                                : 'border-gold-muted/30 bg-gold-bg/50 text-gold-muted'
                            }`}
                          >
                            <option value="">Sin proyecto</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-sm text-brown-dark max-w-[300px] truncate">
                          {t.task_description}
                        </td>
                        <td className="px-4 py-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={t.hours || ''}
                            onChange={(e) => updateTask(i, 'hours', Number(e.target.value) || 0)}
                            placeholder="0"
                            className={`w-16 rounded-md border px-2 py-1 text-right font-mono text-xs font-medium transition-colors ${
                              t.has_hours
                                ? 'border-brown-border bg-white text-terracotta'
                                : 'border-gold-muted/30 bg-gold-bg/50 text-gold-muted placeholder:text-gold-muted/50'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import button */}
              <div className="border-t border-brown-hover bg-cream/30 px-6 py-4 flex items-center justify-between">
                <p className="font-heading text-xs text-brown-light">
                  Se importarán {parsedTasks.length} tareas con un total de {totalHours}h
                </p>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-xl bg-brown-dark px-6 py-2.5 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20 disabled:opacity-50"
                >
                  {importing ? 'Importando...' : 'Confirmar importación'}
                </button>
              </div>
            </div>
          )}

          {!parsing && parsedTasks.length === 0 && selectedMonth !== null && (
            <div className="rounded-card border border-brown-border bg-white px-6 py-10 text-center">
              <p className="font-heading text-sm text-brown-light">
                No se encontraron tareas en la hoja de {MONTH_NAMES[selectedMonth]}.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Success state */}
      {imported && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-card border border-sage/30 bg-sage/5 px-8 py-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage/10">
            <Check size={24} className="text-sage" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-brown-dark">
            Importación completada
          </h3>
          <p className="mt-1 font-heading text-sm text-brown-light">
            Se importaron {parsedTasks.length} tareas ({totalHours}h) de {MONTH_NAMES[selectedMonth]}.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-xl bg-brown-dark px-6 py-2.5 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20"
          >
            Importar otro archivo
          </button>
        </motion.div>
      )}

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 font-heading text-sm text-red-600"
        >
          {error}
        </motion.div>
      )}
    </div>
  )
}

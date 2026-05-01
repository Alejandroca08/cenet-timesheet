import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function AddTaskModal({ isOpen, onClose, onSave, projects, editingTask }) {
  const [form, setForm] = useState({
    task_date: new Date().toISOString().split('T')[0],
    project_id: '',
    task_description: '',
    hours: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (editingTask) {
      setForm({
        task_date: editingTask.task_date,
        project_id: editingTask.project_id || '',
        task_description: editingTask.task_description,
        hours: String(editingTask.hours),
      })
    } else {
      setForm({
        task_date: new Date().toISOString().split('T')[0],
        project_id: '',
        task_description: '',
        hours: '',
      })
    }
    setError(null)
  }, [editingTask, isOpen])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      await onSave({
        ...form,
        hours: parseFloat(form.hours),
        project_id: form.project_id || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-brown-border bg-cream/50 px-4 py-2.5 font-body text-sm text-brown-dark outline-none transition-colors placeholder:text-brown-light/50 focus:border-terracotta focus:ring-1 focus:ring-terracotta/20'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-brown-dark/30 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-card border border-brown-border bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-brown-dark">
                {editingTask ? 'Editar tarea' : 'Agregar tarea'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-brown-light hover:bg-brown-hover hover:text-brown-dark transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date */}
              <div>
                <label className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light">
                  Fecha
                </label>
                <input
                  type="date"
                  value={form.task_date}
                  onChange={(e) => setForm(f => ({ ...f, task_date: e.target.value }))}
                  required
                  className={inputClass}
                />
              </div>

              {/* Project */}
              <div>
                <label className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light">
                  Proyecto
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light">
                  Descripción
                </label>
                <input
                  type="text"
                  value={form.task_description}
                  onChange={(e) => setForm(f => ({ ...f, task_description: e.target.value }))}
                  required
                  placeholder="Descripción de la tarea"
                  className={inputClass}
                />
              </div>

              {/* Hours */}
              <div>
                <label className="mb-1.5 block font-heading text-xs font-medium uppercase tracking-wider text-brown-light">
                  Horas
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={form.hours}
                  onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))}
                  required
                  placeholder="4"
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 font-heading text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-brown-dark px-4 py-3 font-heading text-sm font-semibold text-cream tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brown-dark/20 disabled:opacity-50"
              >
                {saving
                  ? 'Guardando...'
                  : editingTask
                    ? 'Guardar cambios'
                    : 'Agregar tarea'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

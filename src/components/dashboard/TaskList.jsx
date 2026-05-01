import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2, Pencil } from 'lucide-react'
import { formatDateShort } from '../../lib/format'

const PROJECT_COLORS = {
  FacturasApp: { bg: 'rgba(201,100,66,0.08)', text: '#c96442' },
  MiPlanilla:  { bg: 'rgba(91,138,114,0.08)', text: '#5b8a72' },
  MiNomina:    { bg: 'rgba(139,115,85,0.08)', text: '#8b7355' },
  MisFacturas: { bg: 'rgba(107,123,141,0.08)', text: '#6b7b8d' },
  MiPlataforma:{ bg: 'rgba(139,115,85,0.08)', text: '#8b7355' },
  Propensar:   { bg: 'rgba(91,138,114,0.08)', text: '#5b8a72' },
}

const DEFAULT_COLOR = { bg: 'rgba(0,0,0,0.04)', text: '#666' }

export default function TaskList({ tasks, totalHours, loading, onAdd, onEdit, onDelete }) {
  const [hoveredTask, setHoveredTask] = useState(null)

  if (loading) {
    return (
      <div className="rounded-card border border-brown-border bg-white overflow-hidden">
        <div className="border-b border-brown-hover px-6 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-brown-hover" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-5 w-20 animate-pulse rounded-[10px] bg-brown-hover" />
              <div className="h-4 flex-1 animate-pulse rounded bg-brown-hover" />
              <div className="h-4 w-8 animate-pulse rounded bg-brown-hover" />
              <div className="h-4 w-14 animate-pulse rounded bg-brown-hover" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-card border border-brown-border bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brown-hover px-6 py-4">
        <h2 className="font-heading text-base font-semibold text-brown-dark">
          Tareas registradas
        </h2>
        <span className="font-mono text-xs text-brown-light">
          {tasks.length} tareas · {totalHours}h
        </span>
      </div>

      {/* Task rows */}
      {tasks.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="font-heading text-sm text-brown-light">
            No hay tareas registradas este mes.
          </p>
          <p className="font-heading text-xs text-brown-light/60 mt-1">
            Agrega una tarea o importa tu Excel.
          </p>
        </div>
      ) : (
        tasks.map((task, i) => {
          const projectName = task.projects?.name ?? 'Sin proyecto'
          const colors = PROJECT_COLORS[projectName] || DEFAULT_COLOR

          return (
            <div
              key={task.id}
              onMouseEnter={() => setHoveredTask(task.id)}
              onMouseLeave={() => setHoveredTask(null)}
              className="flex items-center justify-between px-6 py-3.5 cursor-default transition-colors duration-150"
              style={{
                backgroundColor: hoveredTask === task.id ? '#fdf9f4' : 'transparent',
                borderBottom: i < tasks.length - 1 ? '1px solid #f5efe6' : 'none',
                animation: `fadeSlideIn 0.4s ease ${i * 55}ms forwards`,
                opacity: 0,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="inline-block rounded-[10px] px-2 py-[1px] font-heading text-[10px] font-semibold tracking-wide"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {projectName}
                  </span>
                </div>
                <p className="text-sm leading-snug text-brown-dark truncate">
                  {task.task_description}
                </p>
              </div>

              <div className="flex items-center gap-3.5 ml-4 flex-shrink-0">
                <span className="font-mono text-[13px] font-medium text-terracotta">
                  {task.hours}h
                </span>
                <span className="text-xs text-brown-light/70">
                  {formatDateShort(task.task_date)}
                </span>

                {/* Action buttons — visible on hover */}
                <div
                  className="flex items-center gap-1 transition-opacity duration-150"
                  style={{ opacity: hoveredTask === task.id ? 1 : 0 }}
                >
                  <button
                    onClick={() => onEdit(task)}
                    className="rounded-md p-1 text-brown-light hover:bg-brown-hover hover:text-brown-dark transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(task.id)}
                    className="rounded-md p-1 text-brown-light hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Add task button */}
      <div className="border-t border-brown-hover bg-[#fdf9f4] px-6 py-3.5 text-center">
        <button
          onClick={onAdd}
          className="rounded-lg bg-terracotta px-6 py-2 font-heading text-[13px] font-semibold text-white tracking-wide shadow-[0_2px_8px_rgba(201,100,66,0.2)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(201,100,66,0.3)]"
        >
          + Agregar tarea
        </button>
      </div>
    </motion.div>
  )
}

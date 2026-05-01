import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { getGreeting, getCurrentMonthName } from '../lib/format'
import { useStats } from '../hooks/useStats'
import { useTasks } from '../hooks/useTasks'
import { usePartnerPeriod } from '../hooks/usePartnerPeriod'
import StatsRow from '../components/dashboard/StatsRow'
import TaskList from '../components/dashboard/TaskList'
import ProjectDonut from '../components/dashboard/ProjectDonut'
import MonthlyTrend from '../components/dashboard/MonthlyTrend'
import AportesCard from '../components/dashboard/AportesCard'
import PlanillaUpload from '../components/dashboard/PlanillaUpload'
import ReadyButton from '../components/dashboard/ReadyButton'
import AddTaskModal from '../components/tasks/AddTaskModal'

const STATUS_LABELS = {
  in_progress: { label: 'En progreso', className: 'bg-gold-bg text-gold-muted border-gold-muted/10' },
  ready:       { label: 'Listo',       className: 'bg-sage/10 text-sage border-sage/10' },
  sent:        { label: 'Enviado',     className: 'bg-slate/10 text-slate border-slate/10' },
}

export default function DashboardPage() {
  const { partner } = useAuth()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { stats, allStats, loading: statsLoading, refetch: refetchStats } = useStats(year, month)
  const { tasks, projects, loading: tasksLoading, addTask, updateTask, deleteTask, refetch: refetchTasks } = useTasks(year, month)
  const { status, period, markReady, unmarkReady } = usePartnerPeriod(year, month)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)

  const greeting = getGreeting()
  const monthName = getCurrentMonthName()
  const totalHours = tasks.reduce((sum, t) => sum + Number(t.hours), 0)
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.in_progress

  const refreshAll = useCallback(() => {
    refetchStats()
    refetchTasks()
  }, [refetchStats, refetchTasks])

  function handleAdd() {
    setEditingTask(null)
    setModalOpen(true)
  }

  function handleEdit(task) {
    setEditingTask(task)
    setModalOpen(true)
  }

  async function handleSave(formData) {
    if (editingTask) {
      await updateTask(editingTask.id, formData)
    } else {
      await addTask(formData)
    }
    refreshAll()
  }

  async function handleDelete(id) {
    await deleteTask(id)
    refreshAll()
  }

  async function handleMarkReady() {
    await markReady()
    refreshAll()
  }

  async function handleUnmarkReady() {
    await unmarkReady()
    refreshAll()
  }

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="mb-9"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] text-brown-light uppercase tracking-[0.15em] mb-1.5">
              {monthName} {year}
            </p>
            <h1 className="font-heading text-[34px] font-light tracking-tight text-brown-dark">
              {greeting},{' '}
              <span className="font-bold">{partner?.full_name?.split(' ')[0]}</span>
            </h1>
          </div>
          <span
            className={`rounded-3xl border px-3.5 py-1 font-heading text-xs font-semibold tracking-wide ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        </div>
        <div className="mt-4 h-[2.5px] w-[52px] rounded-sm bg-terracotta" />
      </motion.div>

      {/* Stats row */}
      <StatsRow stats={stats} loading={statsLoading} />

      {/* Main content: tasks (left) + sidebar (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Left: Task list */}
        <TaskList
          tasks={tasks}
          totalHours={totalHours}
          loading={tasksLoading}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4">
          <ProjectDonut hoursByProject={stats?.hours_by_project} />
          <MonthlyTrend allStats={allStats} currentMonth={month} />
          <AportesCard stats={stats} />
          <PlanillaUpload
            year={year}
            month={month}
            periodId={period?.id}
            onUploaded={refreshAll}
          />
          <ReadyButton
            status={status}
            hasTasks={tasks.length > 0}
            onMarkReady={handleMarkReady}
            onUnmarkReady={handleUnmarkReady}
          />
        </div>
      </div>

      {/* Add/Edit task modal */}
      <AddTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        projects={projects}
        editingTask={editingTask}
      />
    </div>
  )
}

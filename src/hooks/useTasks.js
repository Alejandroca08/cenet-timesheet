import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

async function refreshStats() {
  try {
    await supabase.rpc('refresh_monthly_stats')
  } catch {
    // Silently ignore — stats will refresh on next cron cycle
  }
}

export function useTasks(year, month) {
  const { session } = useAuth()
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*, projects(name)')
        .eq('period_year', year)
        .eq('period_month', month)
        .order('task_date', { ascending: false })

      if (fetchError) throw fetchError
      setTasks(data ?? [])
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true)
      .order('name')
    setProjects(data ?? [])
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchProjects()
  }, [fetchTasks, fetchProjects])

  async function addTask(task) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const date = new Date(task.task_date + 'T12:00:00')
    const weekDay = date.getDay()

    // Calculate week number (1-5) within the month
    const dayOfMonth = date.getDate()
    const weekNumber = Math.ceil(dayOfMonth / 7)

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        partner_id: session.user.id,
        project_id: task.project_id,
        task_description: task.task_description,
        task_date: task.task_date,
        day_of_week: dayNames[weekDay],
        week_number: weekNumber,
        hours: task.hours,
        source: task.source || 'manual',
        period_year: year,
        period_month: month,
      })
      .select('*, projects(name)')
      .single()

    if (error) throw error
    setTasks(prev => [data, ...prev])
    await refreshStats()
    return data
  }

  async function updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*, projects(name)')
      .single()

    if (error) throw error
    setTasks(prev => prev.map(t => (t.id === id ? data : t)))
    await refreshStats()
    return data
  }

  async function deleteTask(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)

    if (error) throw error
    setTasks(prev => prev.filter(t => t.id !== id))
    await refreshStats()
  }

  async function bulkAddTasks(taskRows, { periodYear, periodMonth } = {}) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

    const rows = taskRows.map(t => {
      const date = new Date(t.task_date + 'T12:00:00')
      return {
        partner_id: session.user.id,
        project_id: t.project_id,
        task_description: t.task_description,
        task_date: t.task_date,
        day_of_week: dayNames[date.getDay()],
        week_number: Math.ceil(date.getDate() / 7),
        hours: t.hours,
        source: 'excel_upload',
        period_year: periodYear ?? year,
        period_month: periodMonth ?? month,
      }
    })

    const { data, error } = await supabase
      .from('tasks')
      .insert(rows)
      .select('*, projects(name)')

    if (error) throw error
    setTasks(prev => [...(data ?? []), ...prev])
    await refreshStats()
    return data
  }

  return {
    tasks,
    projects,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    bulkAddTasks,
    refetch: fetchTasks,
  }
}

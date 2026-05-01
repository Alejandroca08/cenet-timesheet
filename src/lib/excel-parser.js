import * as XLSX from 'xlsx'

const MONTH_SHEET_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/**
 * Convert an Excel serial date to ISO string (YYYY-MM-DD).
 */
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

/**
 * Convert an ISO date string to an Excel serial date number.
 */
function isoToExcelDate(isoStr) {
  const date = new Date(isoStr + 'T12:00:00Z')
  return Math.round(date.getTime() / 86400000) + 25569
}

/**
 * Try to extract a project name from the task description.
 * Matches against known project names (case-insensitive).
 * Patterns like "Sheets facturasApp: ..." or "Bot MCP facturasApp: ..."
 */
function extractProjectFromDescription(description, projects) {
  if (!description) return null
  const lower = description.toLowerCase()

  for (const p of projects) {
    if (lower.includes(p.name.toLowerCase())) {
      return p.id
    }
  }
  return null
}

/**
 * Fuzzy-match a project name from the Excel to a project in the database.
 */
function matchProject(excelName, projects) {
  if (!excelName || String(excelName).trim() === '') return null
  const normalized = String(excelName).trim().toLowerCase()

  // Exact match
  const exact = projects.find(p => p.name.toLowerCase() === normalized)
  if (exact) return exact.id

  // Partial / contains match
  const partial = projects.find(p =>
    normalized.includes(p.name.toLowerCase()) ||
    p.name.toLowerCase().includes(normalized)
  )
  if (partial) return partial.id

  return null
}

/**
 * Get the project display name from an ID.
 */
function getProjectName(projectId, projects) {
  if (!projectId) return 'Sin proyecto'
  const p = projects.find(proj => proj.id === projectId)
  return p ? p.name : 'Sin proyecto'
}

/**
 * Parse an uploaded Excel file and extract tasks for a given month.
 *
 * Handles all combinations of filled/empty fields:
 * - Description only (no project, no hours)
 * - Description + hours (no project)
 * - Description + project + hours
 * - Description + project (no hours)
 *
 * Date inheritance: each day has 4 task-slot rows. The date (col 2)
 * only appears on the first row of each day group. Subsequent rows
 * inherit the date from the previous day row.
 *
 * @param {File} file - The uploaded .xlsx file
 * @param {number} monthIndex - 0-based month index (0 = January)
 * @param {Array} projects - Array of { id, name } from the projects table
 * @returns {Promise<Array>} - Parsed tasks ready for preview
 */
export async function parseExcel(file, monthIndex, projects) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheetName = MONTH_SHEET_NAMES[monthIndex]
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`No se encontró la hoja "${sheetName}" en el archivo.`)
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const parsedTasks = []

  // Track the current date for inheritance across the 4-row day groups
  let currentDate = null
  let currentWeek = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Columns: 0=Num Semana, 1=Día, 2=Fecha, 3=Tarea, 4=Proyecto, 5=Hora/Tarea

    const weekValue = row[0]
    const dateValue = row[2]
    const taskDesc = row[3]
    const projectValue = row[4]
    const hoursValue = row[5]

    // Skip the header row
    if (typeof taskDesc === 'string' && taskDesc.toLowerCase() === 'tarea') continue
    if (typeof weekValue === 'string' && weekValue.toLowerCase() === 'num semana') continue

    // Update current week if present
    if (weekValue && typeof weekValue === 'string' && weekValue.trim() !== '') {
      currentWeek = weekValue.trim()
    }

    // Update current date if this row has a date
    if (dateValue && typeof dateValue === 'number') {
      currentDate = excelDateToISO(dateValue)
    } else if (dateValue && typeof dateValue === 'string' && dateValue.trim() !== '') {
      currentDate = String(dateValue).trim()
    }

    // Skip rows with no task description
    if (!taskDesc || typeof taskDesc !== 'string' || taskDesc.trim() === '') continue

    // Skip if we don't have a date at all
    if (!currentDate) continue

    // Determine project: use column value if filled, otherwise try to extract from description
    let projectId = matchProject(projectValue, projects)
    let projectName = projectValue ? String(projectValue).trim() : ''

    if (!projectId) {
      projectId = extractProjectFromDescription(taskDesc, projects)
      projectName = projectId ? getProjectName(projectId, projects) : 'Sin proyecto'
    }

    if (!projectName) {
      projectName = getProjectName(projectId, projects)
    }

    // Hours: use if filled, otherwise default to 0
    const hours = hoursValue && Number(hoursValue) > 0 ? Number(hoursValue) : 0

    parsedTasks.push({
      task_date: currentDate,
      task_description: taskDesc.trim(),
      project_id: projectId,
      project_name: projectName,
      hours,
      week: currentWeek,
      has_hours: hoursValue && Number(hoursValue) > 0,
    })
  }

  return parsedTasks
}

/**
 * Get the list of available month sheets in the workbook.
 */
export async function getAvailableSheets(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })

  return workbook.SheetNames.filter(name =>
    MONTH_SHEET_NAMES.includes(name)
  ).map(name => ({
    name,
    monthIndex: MONTH_SHEET_NAMES.indexOf(name),
  }))
}

/**
 * Export tasks back to the same Excel format.
 *
 * Produces a workbook with the same structure:
 * Columns: Num Semana, Día, Fecha, Tarea, proyecto, Hora/Tarea, Hora/Día, Hora/Semana, Hora/Mes, Total a cobrar
 *
 * @param {Array} tasks - Array of task objects from the database
 * @param {number} month - 1-based month number
 * @param {number} year - Year
 * @param {number} hourlyRate - Partner's hourly rate
 * @returns {Blob} - Excel file as a Blob for download
 */
export function exportToExcel(tasks, month, year, hourlyRate) {
  const sheetName = MONTH_SHEET_NAMES[month - 1]

  // Group tasks by date
  const tasksByDate = {}
  for (const task of tasks) {
    if (!tasksByDate[task.task_date]) {
      tasksByDate[task.task_date] = []
    }
    tasksByDate[task.task_date].push(task)
  }

  // Sort dates
  const sortedDates = Object.keys(tasksByDate).sort()

  // Build rows
  const header = ['Num Semana', 'Día', 'Fecha', 'Tarea', 'proyecto', 'Hora/Tarea', 'Hora/Día', 'Hora/Semana', 'Hora/Mes', 'Total a cobrar']
  const rows = [header]

  let currentWeek = null
  let weekHours = 0
  let monthHours = 0

  for (const dateStr of sortedDates) {
    const dateTasks = tasksByDate[dateStr]
    const date = new Date(dateStr + 'T12:00:00')
    const dayName = DAY_NAMES[date.getDay()]
    const excelDate = isoToExcelDate(dateStr)
    const weekNum = Math.ceil(date.getDate() / 7)
    const weekLabel = `semana ${weekNum}`

    // Track week changes
    if (weekLabel !== currentWeek) {
      currentWeek = weekLabel
    }

    const dayHours = dateTasks.reduce((sum, t) => sum + Number(t.hours), 0)
    weekHours += dayHours
    monthHours += dayHours

    // Each day gets up to 4 rows (task slots)
    for (let slot = 0; slot < 4; slot++) {
      const task = dateTasks[slot]
      const isFirstSlot = slot === 0

      rows.push([
        isFirstSlot ? weekLabel : '',
        isFirstSlot ? dayName : '',
        isFirstSlot ? excelDate : '',
        task ? task.task_description : '',
        task ? (task.projects?.name || '') : '',
        task ? (Number(task.hours) || '') : '',
        isFirstSlot ? dayHours : '',
        '', // Hora/Semana — filled at week boundaries
        '', // Hora/Mes — filled at end
        '', // Total a cobrar — filled at end
      ])
    }
  }

  // Set month totals on the last data row
  if (rows.length > 1) {
    const lastRow = rows[rows.length - 1]
    lastRow[8] = monthHours
    lastRow[9] = monthHours * hourlyRate
  }

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Num Semana
    { wch: 12 }, // Día
    { wch: 12 }, // Fecha
    { wch: 60 }, // Tarea
    { wch: 16 }, // proyecto
    { wch: 10 }, // Hora/Tarea
    { wch: 10 }, // Hora/Día
    { wch: 12 }, // Hora/Semana
    { wch: 10 }, // Hora/Mes
    { wch: 14 }, // Total a cobrar
  ]

  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

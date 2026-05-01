import * as XLSX from 'xlsx'

const MONTH_SHEET_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/**
 * Convert an Excel serial date to a JS Date.
 * Excel serial date: days since 1900-01-01 (with the 1900 leap year bug).
 */
function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null
  // Excel epoch: 1900-01-01. Subtract 25569 to get Unix epoch days.
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

/**
 * Fuzzy-match a project name from the Excel to a project in the database.
 */
function matchProject(excelName, projects) {
  if (!excelName) return null
  const normalized = excelName.trim().toLowerCase()

  // Exact match first
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
 * Parse an uploaded Excel file and extract tasks for a given month.
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

  // Convert sheet to JSON rows
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const parsedTasks = []

  for (const row of rows) {
    // Expected columns based on the template:
    // 0: Num Semana, 1: Día, 2: Fecha, 3: Tarea, 4: Proyecto, 5: Hora/Tarea
    // We look for rows that have a task description and hours
    const taskDesc = row[3]
    const projectName = row[4]
    const hoursValue = row[5]
    const dateValue = row[2]

    // Skip header rows, empty rows, and summary rows
    if (!taskDesc || typeof taskDesc !== 'string' || taskDesc.trim() === '') continue
    if (taskDesc.toLowerCase().startsWith('tarea')) continue // header
    if (!hoursValue || Number(hoursValue) <= 0) continue

    const dateStr = typeof dateValue === 'number'
      ? excelDateToISO(dateValue)
      : dateValue
        ? String(dateValue)
        : null

    if (!dateStr) continue

    const projectId = matchProject(String(projectName), projects)

    parsedTasks.push({
      task_date: dateStr,
      task_description: taskDesc.trim(),
      project_id: projectId,
      project_name: projectName ? String(projectName).trim() : 'Sin proyecto',
      hours: Number(hoursValue),
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

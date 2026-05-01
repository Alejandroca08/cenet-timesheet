/**
 * Format a number as Colombian Pesos (COP).
 * Example: 1740000 -> "$1.740.000"
 */
export function formatCOP(amount) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a date string to a short Spanish locale format.
 * Example: "2026-04-14" -> "14 abr"
 */
export function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  })
}

/**
 * Get the current month name in Spanish.
 */
export function getCurrentMonthName() {
  return new Date().toLocaleDateString("es-CO", { month: "long" })
}

/**
 * Get greeting based on time of day (Spanish).
 */
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Format a timestamp as relative time in Spanish.
 * Example: "2026-04-30T22:00:00Z" -> "hace 2h"
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60) return 'hace un momento'
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)}h`
  const days = Math.floor(diffSec / 86400)
  if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`
  return formatDateShort(dateStr)
}

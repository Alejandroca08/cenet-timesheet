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

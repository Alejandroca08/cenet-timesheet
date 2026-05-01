const UNITS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const TEENS = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const TENS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function convertHundreds(n) {
  if (n === 0) return ''
  if (n === 100) return 'cien'

  const h = Math.floor(n / 100)
  const remainder = n % 100
  let result = HUNDREDS[h]

  if (remainder === 0) return result

  if (h > 0) result += ' '

  if (remainder < 10) {
    result += UNITS[remainder]
  } else if (remainder < 20) {
    result += TEENS[remainder - 10]
  } else if (remainder < 30) {
    const u = remainder % 10
    result += u === 0 ? 'veinte' : 'veinti' + UNITS[u]
  } else {
    const t = Math.floor(remainder / 10)
    const u = remainder % 10
    result += TENS[t]
    if (u > 0) result += ' y ' + UNITS[u]
  }

  return result
}

/**
 * Convert a number to Spanish words.
 * Supports numbers up to 999,999,999,999.
 *
 * @param {number} n - The number to convert
 * @returns {string} - Spanish words (e.g., "un millón setecientos cuarenta mil")
 */
function numberToWords(n) {
  if (n === 0) return 'cero'
  if (n < 0) return 'menos ' + numberToWords(-n)

  n = Math.floor(n)

  const parts = []

  // Billions (millardos)
  const billions = Math.floor(n / 1000000000)
  if (billions > 0) {
    if (billions === 1) {
      parts.push('mil millones')
    } else {
      parts.push(convertHundreds(billions) + ' mil millones')
    }
  }
  n %= 1000000000

  // Millions
  const millions = Math.floor(n / 1000000)
  if (millions > 0) {
    if (millions === 1) {
      parts.push('un millón')
    } else {
      parts.push(convertHundreds(millions) + ' millones')
    }
  }
  n %= 1000000

  // Thousands
  const thousands = Math.floor(n / 1000)
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mil')
    } else {
      parts.push(convertHundreds(thousands) + ' mil')
    }
  }
  n %= 1000

  // Hundreds
  if (n > 0) {
    parts.push(convertHundreds(n))
  }

  return parts.join(' ')
}

/**
 * Convert a COP amount to Spanish words with "pesos" suffix.
 * Capitalizes the first letter.
 *
 * @param {number} amount - Amount in COP
 * @returns {string} - e.g., "Un millón setecientos cuarenta mil pesos"
 */
export function amountToWords(amount) {
  const words = numberToWords(Math.floor(amount))
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1)
  return capitalized + ' pesos'
}

export default numberToWords

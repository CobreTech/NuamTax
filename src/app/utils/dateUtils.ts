/**
 * @file dateUtils.ts
 * @description Utilidades para formatear fechas según la configuración del usuario
 */

/**
 * Formatea una fecha según el formato especificado por el usuario
 * @param date - Fecha a formatear (Date, string o número)
 * @param format - Formato deseado: 'DD/MM/AAAA', 'AAAA-MM-DD', 'MM/DD/AAAA'
 * @returns Fecha formateada como string
 */
export function formatDate(date: Date | string | number, format: string): string {
  let dateObj: Date

  if (date instanceof Date) {
    dateObj = date
  } else if (typeof date === 'string') {
    // Intentar parsear diferentes formatos
    dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      // Si falla, intentar con formato YYYY-MM-DD
      const parts = date.split('-')
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      } else {
        dateObj = new Date()
      }
    }
  } else {
    dateObj = new Date(date)
  }

  if (isNaN(dateObj.getTime())) {
    return ''
  }

  const day = String(dateObj.getDate()).padStart(2, '0')
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const year = String(dateObj.getFullYear())

  switch (format) {
    case 'DD/MM/AAAA':
      return `${day}/${month}/${year}`
    case 'AAAA-MM-DD':
      return `${year}-${month}-${day}`
    case 'MM/DD/AAAA':
      return `${month}/${day}/${year}`
    default:
      return `${day}/${month}/${year}` // Por defecto DD/MM/AAAA
  }
}

/**
 * Parsea una fecha desde un string formateado según la configuración del usuario
 * @param dateString - String de fecha formateado
 * @param format - Formato del string: 'DD/MM/AAAA', 'AAAA-MM-DD', 'MM/DD/AAAA'
 * @returns Date object o null si no se puede parsear
 */
export function parseDate(dateString: string, format: string): Date | null {
  if (!dateString || dateString.trim() === '') {
    return null
  }

  try {
    let day: number, month: number, year: number

    switch (format) {
      case 'DD/MM/AAAA':
        {
          const parts = dateString.split('/')
          if (parts.length !== 3) return null
          day = parseInt(parts[0])
          month = parseInt(parts[1]) - 1
          year = parseInt(parts[2])
        }
        break
      case 'AAAA-MM-DD':
        {
          const parts = dateString.split('-')
          if (parts.length !== 3) return null
          year = parseInt(parts[0])
          month = parseInt(parts[1]) - 1
          day = parseInt(parts[2])
        }
        break
      case 'MM/DD/AAAA':
        {
          const parts = dateString.split('/')
          if (parts.length !== 3) return null
          month = parseInt(parts[0]) - 1
          day = parseInt(parts[1])
          year = parseInt(parts[2])
        }
        break
      default:
        // Intentar parsear como ISO
        const parsed = new Date(dateString)
        if (!isNaN(parsed.getTime())) {
          return parsed
        }
        return null
    }

    const date = new Date(year, month, day)
    if (isNaN(date.getTime())) {
      return null
    }

    return date
  } catch {
    return null
  }
}

/**
 * Obtiene la fecha actual formateada según la configuración del usuario
 * @param format - Formato deseado: 'DD/MM/AAAA', 'AAAA-MM-DD', 'MM/DD/AAAA'
 * @returns Fecha actual formateada
 */
export function getCurrentDateFormatted(format: string): string {
  return formatDate(new Date(), format)
}

/**
 * Normaliza una fecha a formato estándar (YYYY-MM-DD) para almacenamiento
 * @param dateString - String de fecha en cualquier formato
 * @param format - Formato del string de entrada
 * @returns String en formato YYYY-MM-DD o string vacío si no se puede parsear
 */
export function normalizeDateForStorage(dateString: string, format: string): string {
  const date = parseDate(dateString, format)
  if (!date) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


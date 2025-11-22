/**
 * Utilidades de sanitización para prevenir XSS y validar inputs
 */

/**
 * Sanitiza un string removiendo caracteres peligrosos para prevenir XSS
 * @param input - String a sanitizar
 * @returns String sanitizado
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers (onclick, onerror, etc.)
    .trim()
}

/**
 * Valida y sanitiza un número
 * @param input - Valor a validar
 * @param min - Valor mínimo permitido
 * @param max - Valor máximo permitido
 * @returns Número validado o null si es inválido
 */
export function sanitizeNumber(
  input: string | number,
  min?: number,
  max?: number
): number | null {
  const num = typeof input === 'string' ? parseFloat(input) : input

  if (isNaN(num) || !isFinite(num)) {
    return null
  }

  if (min !== undefined && num < min) {
    return null
  }

  if (max !== undefined && num > max) {
    return null
  }

  return num
}

/**
 * Valida el tamaño de un archivo
 * @param file - Archivo a validar
 * @param maxSizeMB - Tamaño máximo en MB
 * @returns Objeto con isValid y error message si aplica
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = 10
): { isValid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `El archivo excede el tamaño máximo permitido de ${maxSizeMB}MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    }
  }

  return { isValid: true }
}

/**
 * Valida el tipo de archivo
 * @param file - Archivo a validar
 * @param allowedTypes - Array de tipos MIME permitidos
 * @returns Objeto con isValid y error message si aplica
 */
export function validateFileType(
  file: File,
  allowedTypes: string[] = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
): { isValid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`
    }
  }

  return { isValid: true }
}


/**
 * Hook personalizado para debounce de valores
 * Útil para optimizar búsquedas y filtros que se ejecutan frecuentemente
 */

import { useState, useEffect } from 'react'

/**
 * Retorna un valor que se actualiza después de un delay especificado
 * @param value - Valor a debounce
 * @param delay - Tiempo de espera en milisegundos
 * @returns Valor debounced
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}


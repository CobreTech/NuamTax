/**
 * Hook para caché de datos de Firestore
 * 
 * Implementa un sistema de caché simple en memoria para evitar
 * múltiples queries innecesarias a Firestore.
 */

import { useState, useEffect, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresIn: number // Tiempo de expiración en milisegundos
}

interface CacheStore {
  [key: string]: CacheEntry<any>
}

// Caché global en memoria
const cache: CacheStore = {}

// Tiempo de expiración por defecto: 5 minutos
const DEFAULT_CACHE_TIME = 5 * 60 * 1000

/**
 * Hook para obtener datos de Firestore con caché
 * @param key - Clave única para el caché
 * @param fetchFn - Función que obtiene los datos de Firestore
 * @param cacheTime - Tiempo de expiración del caché en milisegundos (default: 5 minutos)
 */
export function useFirestoreCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheTime: number = DEFAULT_CACHE_TIME
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Verificar si hay datos en caché válidos
    const cachedEntry = cache[key]
    const now = Date.now()

    if (cachedEntry && (now - cachedEntry.timestamp) < cachedEntry.expiresIn) {
      // Usar datos del caché
      setData(cachedEntry.data)
      setLoading(false)
      return
    }

    // Obtener datos frescos
    setLoading(true)
    setError(null)

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    fetchFn()
      .then((result) => {
        if (!abortControllerRef.current?.signal.aborted) {
          // Guardar en caché
          cache[key] = {
            data: result,
            timestamp: now,
            expiresIn: cacheTime
          }
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!abortControllerRef.current?.signal.aborted) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [key, cacheTime, refreshTrigger])

  /**
   * Función para invalidar el caché de una clave específica
   */
  const invalidateCache = (cacheKey?: string) => {
    const keyToInvalidate = cacheKey || key
    delete cache[keyToInvalidate]

    // Si la clave invalidada es la actual, forzar recarga
    if (keyToInvalidate === key) {
      setRefreshTrigger(prev => prev + 1)
    }
  }

  /**
   * Función para limpiar todo el caché
   */
  const clearCache = () => {
    Object.keys(cache).forEach((k) => delete cache[k])
    setRefreshTrigger(prev => prev + 1)
  }

  return { data, loading, error, invalidateCache, clearCache }
}

/**
 * Función helper para invalidar caché desde fuera del hook
 */
export function invalidateCacheEntry(key: string) {
  delete cache[key]
}

/**
 * Función helper para limpiar todo el caché
 */
export function clearAllCache() {
  Object.keys(cache).forEach((key) => delete cache[key])
}


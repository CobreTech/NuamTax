/**
 * Utilidades para preload de recursos críticos
 * 
 * Permite precargar componentes y recursos importantes
 * para mejorar la experiencia de usuario.
 */

/**
 * Preload de un módulo dinámico
 * Útil para precargar componentes lazy antes de que se necesiten
 */
export function preloadComponent(importFn: () => Promise<any>) {
  // Iniciar la carga del módulo en segundo plano
  importFn().catch(() => {
    // Ignorar errores de preload
  })
}

/**
 * Preload de una imagen
 */
export function preloadImage(src: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
  }
}

/**
 * Preload de un recurso de datos
 */
export function preloadData(url: string) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  }
}

/**
 * Preload de múltiples componentes cuando el usuario está inactivo
 * Usa requestIdleCallback si está disponible
 */
export function preloadOnIdle(importFns: Array<() => Promise<any>>) {
  if (typeof window === 'undefined') return

  const preloadNext = () => {
    if (importFns.length > 0) {
      const importFn = importFns.shift()
      if (importFn) {
        preloadComponent(importFn)
      }
    }
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFns.forEach((importFn) => {
        preloadComponent(importFn)
      })
    })
  } else {
    // Fallback para navegadores sin requestIdleCallback
    setTimeout(() => {
      importFns.forEach((importFn) => {
        preloadComponent(importFn)
      })
    }, 2000)
  }
}


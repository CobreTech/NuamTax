/**
 * Utilidad para registrar el Service Worker
 * 
 * Registra el service worker para habilitar caché offline
 * y mejorar el rendimiento de la aplicación.
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registrado:', registration.scope)
        })
        .catch((error) => {
          console.warn('[SW] Error registrando Service Worker:', error)
        })
    })
  }
}


/**
 * Service Worker para caché offline
 * 
 * Permite que la aplicación funcione sin conexión
 * y mejora el rendimiento con caché de recursos estáticos.
 */

const CACHE_NAME = 'nuam-v1'
const STATIC_CACHE = 'nuam-static-v1'
const DYNAMIC_CACHE = 'nuam-dynamic-v1'

// Recursos estáticos a cachear
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/login'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE
          })
          .map((cacheName) => {
            return caches.delete(cacheName)
          })
      )
    })
  )
  return self.clients.claim()
})

// Estrategia: Network First, luego Cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  
  // Solo cachear requests GET
  if (request.method !== 'GET') {
    return
  }

  // No cachear requests a APIs externas o Firestore
  if (request.url.includes('firebase') || request.url.includes('googleapis')) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clonar la respuesta para cachearla
        const responseToCache = response.clone()
        
        // Cachear respuestas exitosas
        if (response.status === 200) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
        }
        
        return response
      })
      .catch(() => {
        // Si falla la red, intentar desde caché
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          })
        })
      })
  )
})


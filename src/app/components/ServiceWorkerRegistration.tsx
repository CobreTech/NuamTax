/**
 * Componente para registrar el Service Worker
 * 
 * Se ejecuta solo en el cliente para registrar el SW
 */

'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '../utils/registerServiceWorker'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return null
}


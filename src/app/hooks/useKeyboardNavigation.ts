/**
 * Hook para manejo de navegación por teclado
 * 
 * Proporciona funciones para manejar eventos de teclado comunes
 * y mejorar la accesibilidad del sistema.
 */

import { useEffect, useCallback, RefObject } from 'react'

/**
 * Hook para manejar navegación por teclado
 * @param onEscape - Callback cuando se presiona Escape
 * @param onEnter - Callback cuando se presiona Enter
 * @param enabled - Si el hook está habilitado
 */
export function useKeyboardNavigation(
  onEscape?: () => void,
  onEnter?: (e: KeyboardEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault()
        onEscape()
      } else if (e.key === 'Enter' && onEnter && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        // No ejecutar Enter si estamos en un textarea
        if ((e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'button') {
          onEnter(e)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onEscape, onEnter, enabled])
}

/**
 * Hook para manejar navegación con flechas en listas
 * @param itemCount - Número de items en la lista
 * @param onSelect - Callback cuando se selecciona un item
 * @param enabled - Si el hook está habilitado
 */
export function useArrowNavigation(
  itemCount: number,
  onSelect: (index: number) => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      if (!enabled) return

      let newIndex = currentIndex

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        newIndex = currentIndex < itemCount - 1 ? currentIndex + 1 : 0
        onSelect(newIndex)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : itemCount - 1
        onSelect(newIndex)
      } else if (e.key === 'Home') {
        e.preventDefault()
        onSelect(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        onSelect(itemCount - 1)
      }
    },
    [itemCount, onSelect, enabled]
  )

  return handleKeyDown
}

/**
 * Hook para focus trap en modales
 * Mantiene el foco dentro del modal usando Tab
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Enfocar el primer elemento al abrir
    firstElement.focus()

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [containerRef, enabled])
}

/**
 * Hook para restaurar el foco al elemento que abrió el modal
 */
export function useRestoreFocus() {
  const previousActiveElementRef = useCallback(() => {
    return document.activeElement as HTMLElement | null
  }, [])

  const restoreFocus = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus()
    }
  }, [])

  return { previousActiveElementRef, restoreFocus }
}


'use client'

import { useEffect, useRef } from 'react'
import { useFocusTrap, useKeyboardNavigation } from '../hooks/useKeyboardNavigation'
import Icons from '../utils/icons'
import Portal from './Portal'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap para mantener el foco dentro del modal
  useFocusTrap(dialogRef, isOpen)

  // Manejar tecla Escape para cerrar
  useKeyboardNavigation(
    () => onCancel(),
    undefined,
    isOpen
  )

  // Enfocar el botón de cancelar al abrir
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  // Colores según la variante
  const variantStyles = {
    danger: {
      icon: Icons.Error,
      iconColor: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: Icons.Warning,
      iconColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      icon: Icons.Info,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  }

  const styles = variantStyles[variant]
  const Icon = styles.icon

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div
          ref={dialogRef}
          className="backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className={`p-3 ${styles.bgColor} ${styles.borderColor} border rounded-xl`} aria-hidden="true">
              <Icon className={`w-6 h-6 ${styles.iconColor}`} />
            </div>
            <div className="flex-1">
              <h2 id="confirm-dialog-title" className="text-xl lg:text-2xl font-bold text-white mb-2">
                {title}
              </h2>
              <p id="confirm-dialog-description" className="text-sm lg:text-base text-gray-300">
                {message}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onCancel}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors text-sm font-medium text-white"
              aria-label={cancelText}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 ${styles.buttonColor} rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors text-sm font-semibold text-white`}
              aria-label={confirmText}
              autoFocus={variant === 'danger'}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

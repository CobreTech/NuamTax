/**
 * Componente LoadingSpinner
 * 
 * Indicador de carga ligero y rápido sin retrasos visuales.
 * Se muestra instantáneamente mientras se cargan los componentes.
 */

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full"></div>
        <div className="absolute inset-0 border-2 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
      </div>
    </div>
  )
}

/**
 * Spinner minimalista para uso inline
 */
export function InlineSpinner() {
  return (
    <div className="inline-block w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
  )
}


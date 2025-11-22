/**
 * Componente SkeletonLoader
 * 
 * Muestra placeholders animados mientras se cargan los datos.
 * Mejora la percepción de rendimiento y experiencia de usuario.
 */

interface SkeletonLoaderProps {
  rows?: number
  columns?: number
  className?: string
}

export default function SkeletonLoader({ 
  rows = 5, 
  columns = 1,
  className = '' 
}: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="flex-1 h-12 bg-slate-700/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton específico para tablas de calificaciones
 * Versión minimalista para carga rápida sin retrasos visuales
 */
export function QualificationTableSkeleton() {
  return null // Sin skeleton para carga instantánea
}


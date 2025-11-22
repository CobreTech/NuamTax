/**
 * Componente SkipLink
 * 
 * Permite a los usuarios de lectores de pantalla saltar
 * directamente al contenido principal, mejorando la navegación.
 */

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-950"
    >
      Saltar al contenido principal
    </a>
  )
}


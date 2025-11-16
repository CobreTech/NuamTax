'use client'

/**
 * Componente OverviewSection (Sección de Resumen General)
 * 
 * Muestra la vista principal del dashboard, proporcionando un resumen visual
 * y acceso rápido a las funcionalidades más importantes.
 * 
 * Contenido:
 * - Panel de Acciones Rápidas: Botones para navegar a otras secciones.
 * - Tabla de Calificaciones Recientes: Muestra las últimas calificaciones procesadas.
 * - Panel de Actividad Reciente: Lista de las últimas acciones realizadas en el sistema.
 * - Tarjeta de Consejo del Día: Proporciona información útil al usuario.
 *
 * @param {OverviewSectionProps} props - Propiedades del componente.
 * @param {Qualification[]} props.mockQualifications - Array de datos de calificaciones.
 * @param {RecentActivity[]} props.recentActivity - Array con la actividad reciente.
 * @param {(tab: ActiveTab) => void} props.setActiveTab - Función para cambiar la pestaña activa en el dashboard principal.
 */

import { Qualification, RecentActivity, ActiveTab } from './types'
import Icons from '../../utils/icons' // Importa los tipos de datos necesarios.

// Define la interfaz de las propiedades que espera el componente.
interface OverviewSectionProps {
  mockQualifications: Qualification[];
  recentActivity: RecentActivity[];
  setActiveTab: (tab: ActiveTab) => void;
}

// Exporta el componente funcional OverviewSection.
export default function OverviewSection({ 
  mockQualifications, 
  recentActivity, 
  setActiveTab 
}: OverviewSectionProps) {
  return (
    // Estructura de grid principal que divide la sección en un panel izquierdo (2/3) y uno derecho (1/3).
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* --- PANEL IZQUIERDO: ACCIONES PRINCIPALES Y TABLA --- */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tarjeta de Acciones Rápidas */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
          {/* Grid con los botones de acción que cambian la pestaña activa. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('upload')}
              className="p-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-xl hover:from-orange-600/30 hover:to-amber-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Ir a Carga Masiva"
            >
              <div className="mb-2"><Icons.Upload className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Carga Masiva</div>
              <div className="text-xs text-gray-400">CSV/Excel</div>
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className="p-4 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/50 rounded-xl hover:from-amber-600/30 hover:to-yellow-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Ir a Reportes"
            >
              <div className="mb-2"><Icons.BarChart className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Generar Reporte</div>
              <div className="text-xs text-gray-400">DJ1948</div>
            </button>
            <button 
              onClick={() => setActiveTab('qualifications')}
              className="p-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/50 rounded-xl hover:from-red-600/30 hover:to-orange-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Ir a Calificaciones"
            >
              <div className="mb-2"><Icons.FileText className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Ver Calificaciones</div>
              <div className="text-xs text-gray-400">Gestión</div>
            </button>
            <button 
              onClick={() => setActiveTab('qualifications')}
              className="p-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/50 rounded-xl hover:from-orange-500/30 hover:to-amber-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Buscar Calificaciones"
            >
              <div className="mb-2"><Icons.Search className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Buscar</div>
              <div className="text-xs text-gray-400">Calificaciones</div>
            </button>
          </div>
        </div>

        {/* Tabla de Calificaciones Recientes */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">Calificaciones Recientes</h2>
          <div className="overflow-x-auto"> {/* Permite scroll horizontal en pantallas pequeñas */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">ID</th>
                  <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">Tipo de Instrumento</th>
                  <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">Factor</th>
                  <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">Monto</th>
                  <th className="text-left py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">Estado</th>
                </tr>
              </thead>
              <tbody>
                {/* Mapea y muestra las primeras 4 calificaciones del array de mock data. */}
                {mockQualifications.slice(0, 4).map((row, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">{row.id}</td>
                    <td className="py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">{row.tipoInstrumento}</td>
                    <td className="py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">{row.factors}</td>
                    <td className="py-2 lg:py-3 px-2 lg:px-4 text-sm lg:text-base">{row.amount}</td>
                    <td className="py-2 lg:py-3 px-2 lg:px-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                        Validado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- PANEL DERECHO: ACTIVIDAD Y CONSEJOS --- */}
      <div className="space-y-4 lg:space-y-6">
        {/* Tarjeta de Actividad Reciente */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {/* Mapea y muestra cada elemento de la actividad reciente. */}
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-white/5 rounded-xl transition-all">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-400' : 'bg-yellow-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta de Consejo del Día */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-2xl p-4 lg:p-6">
          <h3 className="font-bold mb-2 flex items-center gap-2"><Icons.Info className="w-5 h-5" /> Consejo del día</h3>
          <p className="text-sm text-gray-300">
            Recuerda validar que la suma de factores 8-19 no supere 1.0 para cumplir con la normativa tributaria.
          </p>
        </div>
      </div>
    </div>
  )
}

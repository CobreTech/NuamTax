'use client'

/**
 * Componente OverviewSection (Sección de Resumen General)
 * 
 * Muestra la vista principal del dashboard, proporcionando un resumen visual
 * y acceso rápido a las funcionalidades más importantes.
 * 
 * Contenido:
 * - Panel de Acciones Rápidas: Botones para navegar a otras secciones.
 * - Tabla de Calificaciones Recientes: Muestra las últimas calificaciones procesadas (DATOS REALES).
 * - Panel de Actividad Reciente: Lista de las últimas acciones realizadas en el sistema (DATOS REALES).
 * - Tarjeta de Consejo del Día: Proporciona información útil al usuario.
 *
 * @param {OverviewSectionProps} props - Propiedades del componente.
 * @param {string} props.brokerId - ID del corredor para cargar datos reales.
 * @param {(tab: ActiveTab) => void} props.setActiveTab - Función para cambiar la pestaña activa en el dashboard principal.
 */

import { useState, useEffect } from 'react'
import { Qualification, RecentActivity, ActiveTab, TaxQualification } from './types'
import { getRecentQualifications } from '../../services/firestoreService'
import { getRecentActivity, RecentActivityItem } from '../../services/auditService'
import Icons from '../../utils/icons'

// Define la interfaz de las propiedades que espera el componente.
interface OverviewSectionProps {
  brokerId?: string;
  setActiveTab: (tab: ActiveTab) => void;
}

// Función auxiliar para convertir TaxQualification a Qualification (formato UI)
function formatQualificationForUI(qual: TaxQualification): Qualification {
  // Obtener factores activos
  const activeFactors: string[] = [];
  Object.entries(qual.factores).forEach(([key, value]) => {
    if (value > 0) {
      const factorNum = key.replace('factor', '');
      activeFactors.push(`F${factorNum}`);
    }
  });
  const factorsStr = activeFactors.length > 0 
    ? activeFactors.length === 1 
      ? activeFactors[0] 
      : `${activeFactors[0]}-${activeFactors[activeFactors.length - 1]}`
    : 'N/A';

  // Formatear monto
  const amountStr = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: qual.monto.moneda || 'CLP',
    minimumFractionDigits: 0,
  }).format(qual.monto.valor);

  // Formatear fecha
  const lastUpdate = new Date(qual.fechaUltimaModificacion).toLocaleDateString('es-CL');

  // Extraer ID corto para mostrar (sin el prefijo CAL- si existe)
  let displayId = qual.id;
  if (qual.id.startsWith('CAL-')) {
    // Mostrar solo los primeros componentes del ID para que sea más legible
    const parts = qual.id.split('-');
    if (parts.length >= 4) {
      // Mostrar: tipo-mercado-periodo (sin el usuarioId al final)
      displayId = parts.slice(1, 4).join('-').toUpperCase();
    } else {
      displayId = qual.id.substring(4, 12).toUpperCase(); // Primeros caracteres después de CAL-
    }
  } else {
    // Si no tiene formato nuevo, mostrar primeros 8 caracteres
    displayId = qual.id.substring(0, 8).toUpperCase();
  }
  
  return {
    id: displayId,
    tipoInstrumento: qual.tipoInstrumento,
    mercadoOrigen: qual.mercadoOrigen,
    periodo: qual.periodo,
    factors: factorsStr,
    amount: amountStr,
    lastUpdate,
  };
}

// Función auxiliar para convertir RecentActivityItem a RecentActivity
function formatActivityForUI(activity: RecentActivityItem, index: number): RecentActivity {
  // Usar un hash simple del ID para generar un número único, o usar el índice como fallback
  let numericId = 0;
  if (activity.id) {
    // Generar un número único basado en el hash del ID
    for (let i = 0; i < activity.id.length; i++) {
      numericId = ((numericId << 5) - numericId) + activity.id.charCodeAt(i);
      numericId = numericId & numericId; // Convertir a entero de 32 bits
    }
    numericId = Math.abs(numericId) || index + 1; // Asegurar que sea positivo
  } else {
    numericId = index + 1;
  }
  
  return {
    id: numericId,
    action: activity.action,
    time: activity.time,
    status: activity.status,
  };
}

// Exporta el componente funcional OverviewSection.
export default function OverviewSection({ 
  brokerId,
  setActiveTab 
}: OverviewSectionProps) {
  const [qualifications, setQualifications] = useState<Qualification[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (!brokerId) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Cargar calificaciones recientes
        const recentQuals = await getRecentQualifications(brokerId, 4)
        const formattedQuals = recentQuals.map(formatQualificationForUI)
        setQualifications(formattedQuals)

        // Cargar actividad reciente
        const activity = await getRecentActivity(brokerId, 4)
        const formattedActivity = activity.map((act, index) => formatActivityForUI(act, index))
        setRecentActivity(formattedActivity)
      } catch (error) {
        console.error('Error cargando datos del overview:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Listener para recargar después de cambios
    const handleReload = () => {
      loadData()
    }
    window.addEventListener('reloadQualifications', handleReload)
    window.addEventListener('reloadBrokerStats', handleReload)
    
    return () => {
      window.removeEventListener('reloadQualifications', handleReload)
      window.removeEventListener('reloadBrokerStats', handleReload)
    }
  }, [brokerId])
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Cargando calificaciones...
                    </td>
                  </tr>
                ) : qualifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No hay calificaciones recientes
                    </td>
                  </tr>
                ) : (
                  qualifications.map((row, i) => (
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
                  ))
                )}
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
            {loading ? (
              <div className="text-center text-gray-400 py-4">Cargando actividad...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center text-gray-400 py-4">No hay actividad reciente</div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={`activity-${activity.id}-${index}`} className="flex items-start space-x-3 p-3 hover:bg-white/5 rounded-xl transition-all">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' 
                      ? 'bg-green-400' 
                      : activity.status === 'warning'
                      ? 'bg-yellow-400'
                      : 'bg-red-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
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

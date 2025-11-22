'use client'

/**
 * Componente OverviewSection (Sección de Resumen General)
 * 
 * Muestra la vista principal del dashboard, proporcionando un resumen visual
 * y acceso rápido a las funcionalidades más importantes.
 * 
 * Contenido:
 * - Panel de Acciones Rápidas: Botones para navegar a otras secciones.
 * - Gráfico de Distribución: Visualización de calificaciones por tipo o mercado (Monto Total).
 * - Tabla de Calificaciones Recientes: Muestra las últimas calificaciones procesadas (DATOS REALES).
 * - Panel de Actividad Reciente: Lista de las últimas acciones realizadas en el sistema (DATOS REALES).
 * - Tarjeta de Consejo del Día: Proporciona información útil al usuario.
 */

import { useState, useEffect, memo, useMemo } from 'react'
import { Qualification, RecentActivity, ActiveTab, TaxQualification } from './types'
import { getRecentQualifications } from '../../services/firestoreService'
import { getRecentActivity, RecentActivityItem } from '../../services/auditService'
import { useFirestoreCache } from '../../hooks/useFirestoreCache'
import Icons from '../../utils/icons'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

interface OverviewSectionProps {
  brokerId?: string;
  setActiveTab: (tab: ActiveTab) => void;
}

// Consejos rotativos
const TIPS = [
  "Recuerda validar que la suma de factores 8-19 no supere 1.0 para cumplir con la normativa tributaria.",
  "Utiliza la carga masiva para procesar grandes volúmenes de datos de manera eficiente.",
  "Puedes exportar tus reportes en formato PDF para facilitar la presentación ante el SII.",
  "Mantén actualizada tu configuración de usuario para asegurar el formato correcto de fechas.",
  "Revisa periódicamente el log de actividad para detectar accesos no autorizados."
];

function formatQualificationForUI(qual: TaxQualification): Qualification {
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

  const amountStr = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: qual.monto.moneda || 'CLP',
    minimumFractionDigits: 0,
  }).format(qual.monto.valor);

  const lastUpdate = new Date(qual.fechaUltimaModificacion).toLocaleDateString('es-CL');

  let displayId = qual.id;
  if (qual.id.startsWith('CAL-')) {
    const parts = qual.id.split('-');
    if (parts.length >= 4) {
      displayId = parts.slice(1, 4).join('-').toUpperCase();
    } else {
      displayId = qual.id.substring(4, 12).toUpperCase();
    }
  } else {
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

function formatActivityForUI(activity: RecentActivityItem, index: number): RecentActivity {
  let numericId = 0;
  if (activity.id) {
    for (let i = 0; i < activity.id.length; i++) {
      numericId = ((numericId << 5) - numericId) + activity.id.charCodeAt(i);
      numericId = numericId & numericId;
    }
    numericId = Math.abs(numericId) || index + 1;
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

function OverviewSection({
  brokerId,
  setActiveTab
}: OverviewSectionProps) {
  const [qualifications, setQualifications] = useState<Qualification[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [tipIndex, setTipIndex] = useState(0)
  const [rawQualifications, setRawQualifications] = useState<TaxQualification[]>([])
  const [chartView, setChartView] = useState<'instrument' | 'market'>('instrument')

  // Rotar tips cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const { data: cachedRecentQuals, loading: qualsLoading, invalidateCache: invalidateQualsCache } = useFirestoreCache<TaxQualification[]>(
    `recent-qualifications-${brokerId}`,
    () => {
      if (!brokerId) return Promise.resolve([])
      return getRecentQualifications(brokerId, 20) // Traemos más para el gráfico
    },
    2 * 60 * 1000
  )

  const { data: cachedActivity, loading: activityLoading, invalidateCache: invalidateActivityCache } = useFirestoreCache<RecentActivityItem[]>(
    `recent-activity-${brokerId}`,
    () => {
      if (!brokerId) return Promise.resolve([])
      return getRecentActivity(brokerId, 6)
    },
    2 * 60 * 1000
  )

  useEffect(() => {
    if (cachedRecentQuals) {
      setRawQualifications(cachedRecentQuals)
      const formattedQuals = cachedRecentQuals.slice(0, 5).map(formatQualificationForUI)
      setQualifications(formattedQuals)
    }
    if (cachedActivity) {
      const formattedActivity = cachedActivity.map((act, index) => formatActivityForUI(act, index))
      setRecentActivity(formattedActivity)
    }
    setLoading(qualsLoading || activityLoading)
  }, [cachedRecentQuals, cachedActivity, qualsLoading, activityLoading])

  useEffect(() => {
    const handleReload = () => {
      invalidateQualsCache()
      invalidateActivityCache()
    }
    window.addEventListener('reloadQualifications', handleReload)
    window.addEventListener('reloadBrokerStats', handleReload)

    return () => {
      window.removeEventListener('reloadQualifications', handleReload)
      window.removeEventListener('reloadBrokerStats', handleReload)
    }
  }, [invalidateQualsCache, invalidateActivityCache])

  // Datos para el gráfico (Monto Total)
  const chartData = useMemo(() => {
    const amounts: Record<string, number> = {}

    rawQualifications.forEach(q => {
      const key = chartView === 'instrument'
        ? (q.tipoInstrumento || 'Otros')
        : (q.mercadoOrigen || 'Otros')

      amounts[key] = (amounts[key] || 0) + (q.monto.valor || 0)
    })

    return {
      labels: Object.keys(amounts),
      datasets: [
        {
          data: Object.values(amounts),
          backgroundColor: [
            'rgba(249, 115, 22, 0.8)', // Orange
            'rgba(245, 158, 11, 0.8)', // Amber
            'rgba(239, 68, 68, 0.8)',  // Red
            'rgba(59, 130, 246, 0.8)', // Blue
            'rgba(16, 185, 129, 0.8)', // Emerald
            'rgba(139, 92, 246, 0.8)', // Violet
          ],
          borderColor: [
            'rgba(249, 115, 22, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(139, 92, 246, 1)',
          ],
          borderWidth: 1,
        },
      ],
    }
  }, [rawQualifications, chartView])

  const getActivityIcon = (action: string) => {
    const lowerAction = action.toLowerCase()
    if (lowerAction.includes('login') || lowerAction.includes('inicio')) return <Icons.User className="w-4 h-4 text-green-400" />
    if (lowerAction.includes('logout') || lowerAction.includes('cierre')) return <Icons.User className="w-4 h-4 text-red-400" />
    if (lowerAction.includes('carga') || lowerAction.includes('upload')) return <Icons.Upload className="w-4 h-4 text-blue-400" />
    if (lowerAction.includes('cread') || lowerAction.includes('create')) return <Icons.Add className="w-4 h-4 text-orange-400" />
    if (lowerAction.includes('actualiz') || lowerAction.includes('update')) return <Icons.Edit className="w-4 h-4 text-yellow-400" />
    if (lowerAction.includes('elimin') || lowerAction.includes('delete')) return <Icons.Delete className="w-4 h-4 text-red-500" />
    return <Icons.Info className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* --- PANEL IZQUIERDO --- */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tarjeta de Acciones Rápidas */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setActiveTab('upload')}
              className="p-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-xl hover:from-orange-600/30 hover:to-amber-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 group"
            >
              <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icons.Upload className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Carga Masiva</div>
              <div className="text-xs text-gray-400">CSV/Excel</div>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="p-4 bg-gradient-to-r from-amber-600/20 to-yellow-600/20 border border-amber-500/50 rounded-xl hover:from-amber-600/30 hover:to-yellow-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 group"
            >
              <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icons.BarChart className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Generar Reporte</div>
              <div className="text-xs text-gray-400">DJ1948</div>
            </button>
            <button
              onClick={() => setActiveTab('qualifications')}
              className="p-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/50 rounded-xl hover:from-red-600/30 hover:to-orange-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 group"
            >
              <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icons.FileText className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Ver Calificaciones</div>
              <div className="text-xs text-gray-400">Gestión</div>
            </button>
            <button
              onClick={() => setActiveTab('qualifications')}
              className="p-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/50 rounded-xl hover:from-orange-500/30 hover:to-amber-500/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 group"
            >
              <div className="mb-2 transform group-hover:scale-110 transition-transform"><Icons.Search className="w-8 h-8 mx-auto" /></div>
              <div className="font-semibold">Buscar</div>
              <div className="text-xs text-gray-400">Calificaciones</div>
            </button>
          </div>
        </div>

        {/* Gráfico y Tabla */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gráfico de Distribución */}
          <div className="md:col-span-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[250px]">
            <div className="w-full flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-300">Monto Total</h3>
              <div className="flex bg-black/20 rounded-lg p-1">
                <button
                  onClick={() => setChartView('instrument')}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${chartView === 'instrument' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Instr.
                </button>
                <button
                  onClick={() => setChartView('market')}
                  className={`px-2 py-1 text-[10px] rounded-md transition-all ${chartView === 'market' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Merc.
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-gray-400 text-sm">Cargando...</div>
            ) : rawQualifications.length === 0 ? (
              <div className="text-gray-400 text-sm text-center">Sin datos suficientes</div>
            ) : (
              <div className="w-40 h-40 relative">
                <Doughnut
                  data={chartData}
                  options={{
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                          label: (context) => {
                            const value = context.raw as number;
                            return new Intl.NumberFormat('es-CL', {
                              style: 'currency',
                              currency: 'CLP',
                              maximumFractionDigits: 0
                            }).format(value);
                          }
                        }
                      }
                    },
                    cutout: '70%',
                    responsive: true,
                    maintainAspectRatio: true
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-500 font-medium">
                    {chartView === 'instrument' ? 'Por Tipo' : 'Por Mercado'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Calificaciones Recientes */}
          <div className="md:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg lg:text-xl font-bold">Calificaciones Recientes</h2>
              <button
                onClick={() => setActiveTab('qualifications')}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Ver todas
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">ID</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">Instrumento</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">Monto</th>
                    <th className="text-left py-2 px-2 text-xs text-gray-400 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                        Cargando...
                      </td>
                    </tr>
                  ) : qualifications.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                        No hay calificaciones recientes
                      </td>
                    </tr>
                  ) : (
                    qualifications.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-white/5 hover:bg-white/10 cursor-pointer transition-colors group"
                        onClick={() => setActiveTab('qualifications')}
                      >
                        <td className="py-3 px-2 text-sm font-mono text-gray-300 group-hover:text-white">{row.id}</td>
                        <td className="py-3 px-2 text-sm">{row.tipoInstrumento}</td>
                        <td className="py-3 px-2 text-sm font-medium text-white">{row.amount}</td>
                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400 border border-green-500/30">
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
      </div>

      {/* --- PANEL DERECHO --- */}
      <div className="space-y-4 lg:space-y-6">
        {/* Tarjeta de Actividad Reciente */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4">Actividad Reciente</h2>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-400 py-4 text-sm">Cargando actividad...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center text-gray-400 py-4 text-sm">No hay actividad reciente</div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={`activity-${activity.id}-${index}`} className="flex items-start space-x-3 group">
                  <div className={`mt-1 p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:border-orange-500/30 transition-colors`}>
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tarjeta de Consejo del Día (Dinámica) */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-600/10 to-amber-600/10 border border-orange-500/30 rounded-2xl p-4 lg:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icons.Info className="w-16 h-16" />
          </div>
          <h3 className="font-bold mb-2 flex items-center gap-2 text-orange-400">
            <Icons.Info className="w-5 h-5" />
            Consejo del día
          </h3>
          <div className="min-h-[60px] flex items-center">
            <p className="text-sm text-gray-300 animate-fadeIn">
              {TIPS[tipIndex]}
            </p>
          </div>
          <div className="flex justify-center gap-1 mt-2">
            {TIPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === tipIndex ? 'bg-orange-500' : 'bg-white/10'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(OverviewSection)

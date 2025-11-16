'use client'

/**
 * Componente QualificationsSection (Sección de Calificaciones) - 100% Funcional
 * 
 * Implementa:
 * - RF-05: Ingreso y modificación manual
 * - RF-06: Búsqueda y filtrado avanzado
 * - RF-07: Generación de reportes (exportación)
 * 
 * Funcionalidades:
 * - Carga datos reales desde Firestore
 * - Búsqueda y filtros avanzados funcionales
 * - Edición de calificaciones
 * - Exportación a CSV/Excel
 * - Paginación funcional
 */

import { useState, useEffect, useMemo } from 'react'
import { TaxQualification, ActiveTab } from './types'
import { getQualificationsByBrokerId, searchQualifications } from '../../services/firestoreService'
import { exportToCSV, exportToExcel } from '../../services/exportService'
import EditQualificationModal from './EditQualificationModal'
import Icons from '../../utils/icons'

interface QualificationsSectionProps {
  brokerId?: string
  setActiveTab: (tab: ActiveTab) => void
  pageSize: number
}

export default function QualificationsSection({ 
  brokerId = 'broker-demo-001',
  setActiveTab,
  pageSize 
}: QualificationsSectionProps) {
  const [qualifications, setQualifications] = useState<TaxQualification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMarket, setFilterMarket] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingQual, setEditingQual] = useState<TaxQualification | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Cargar calificaciones desde Firestore
  useEffect(() => {
    const loadQualifications = async () => {
      if (!brokerId) {
        console.warn('[QualificationsSection] brokerId no disponible');
        setLoading(false);
        return;
      }
      
      setLoading(true)
      setError(null)
      try {
        console.log('[QualificationsSection] Cargando calificaciones para brokerId:', brokerId);
        const data = await getQualificationsByBrokerId(brokerId, 1000)
        console.log('[QualificationsSection] Calificaciones cargadas:', data.length);
        setQualifications(data)
      } catch (error) {
        console.error('Error cargando calificaciones:', error)
        setError('Error al cargar las calificaciones. Por favor, intenta nuevamente.')
      } finally {
        setLoading(false)
      }
    }
    loadQualifications()

    // Listener para recargar después de ediciones
    const handleReload = () => {
      loadQualifications()
    }
    window.addEventListener('reloadQualifications', handleReload)
    
    return () => {
      window.removeEventListener('reloadQualifications', handleReload)
    }
  }, [brokerId])

  // Obtener períodos únicos para el filtro
  const uniquePeriods = useMemo(() => {
    const periods = new Set(qualifications.map(q => q.periodo))
    return Array.from(periods).sort().reverse()
  }, [qualifications])

  // Obtener mercados únicos para el filtro
  const uniqueMarkets = useMemo(() => {
    const markets = new Set(qualifications.map(q => q.mercadoOrigen))
    return Array.from(markets).sort()
  }, [qualifications])

  // Filtrar calificaciones
  const filteredQualifications = useMemo(() => {
    let filtered = [...qualifications]

    // Búsqueda por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(q =>
        q.tipoInstrumento.toLowerCase().includes(term) ||
        q.mercadoOrigen.toLowerCase().includes(term) ||
        q.periodo.toLowerCase().includes(term) ||
        (q.tipoCalificacion && q.tipoCalificacion.toLowerCase().includes(term))
      )
    }

    // Filtro por mercado
    if (filterMarket) {
      filtered = filtered.filter(q => q.mercadoOrigen === filterMarket)
    }

    // Filtro por período
    if (filterPeriod) {
      filtered = filtered.filter(q => q.periodo === filterPeriod)
    }

    // Filtro por monto mínimo
    if (filterMinAmount) {
      const min = parseFloat(filterMinAmount)
      if (!isNaN(min)) {
        filtered = filtered.filter(q => q.monto.valor >= min)
      }
    }

    // Filtro por monto máximo
    if (filterMaxAmount) {
      const max = parseFloat(filterMaxAmount)
      if (!isNaN(max)) {
        filtered = filtered.filter(q => q.monto.valor <= max)
      }
    }

    return filtered
  }, [qualifications, searchTerm, filterMarket, filterPeriod, filterMinAmount, filterMaxAmount])

  // Paginación
  const totalPages = Math.ceil(filteredQualifications.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedQualifications = filteredQualifications.slice(startIndex, endIndex)

  // Formatear factores para mostrar
  const formatFactors = (factores: TaxQualification['factores']): string => {
    const activeFactors = Object.entries(factores)
      .filter(([_, value]) => value > 0)
      .map(([key]) => key.toUpperCase().replace('FACTOR', 'F'))
    
    if (activeFactors.length === 0) return 'N/A'
    if (activeFactors.length <= 3) return activeFactors.join(', ')
    return `${activeFactors[0]}-${activeFactors[activeFactors.length - 1]}`
  }

  // Formatear monto
  const formatAmount = (monto: TaxQualification['monto']): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: monto.moneda || 'CLP',
      minimumFractionDigits: 0
    }).format(monto.valor)
  }

  // Exportar a CSV
  const handleExportCSV = () => {
    setIsExporting(true)
    try {
      exportToCSV(filteredQualifications, 'calificaciones_tributarias')
    } catch (error) {
      console.error('Error exportando CSV:', error)
      alert('Error al exportar el archivo CSV')
    } finally {
      setIsExporting(false)
    }
  }

  // Exportar a Excel
  const handleExportExcel = () => {
    setIsExporting(true)
    try {
      exportToExcel(filteredQualifications, 'calificaciones_tributarias')
    } catch (error) {
      console.error('Error exportando Excel:', error)
      alert('Error al exportar el archivo Excel')
    } finally {
      setIsExporting(false)
    }
  }

  // Manejar edición
  const handleEdit = (qual: TaxQualification) => {
    setEditingQual(qual)
  }

  const handleSaveEdit = () => {
    // Disparar evento para recargar
    window.dispatchEvent(new Event('reloadQualifications'))
    setEditingQual(null)
  }

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('')
    setFilterMarket('')
    setFilterPeriod('')
    setFilterMinAmount('')
    setFilterMaxAmount('')
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <Icons.Refresh className="w-12 h-12 mx-auto mb-4 animate-spin text-orange-500" />
        <p className="text-gray-400">Cargando calificaciones...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {error && (
        <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/50 rounded-2xl p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <Icons.Error className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm lg:text-base">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-500/20 rounded transition-colors"
              aria-label="Cerrar"
            >
              <Icons.Close className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>
      )}
      {qualifications.length === 0 && !loading ? (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 text-center">
          <div className="mb-4"><Icons.FileText className="w-16 h-16 lg:w-24 lg:h-24 mx-auto text-gray-400" /></div>
          <h2 className="text-xl lg:text-2xl font-bold mb-4">Aún no hay calificaciones cargadas</h2>
          <p className="text-gray-400 mb-6 text-sm lg:text-base">Comienza cargando tu primer archivo de calificaciones tributarias</p>
          <button
            onClick={() => setActiveTab('upload')}
            className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
          >
            Ir a Carga Masiva
          </button>
        </div>
      ) : (
        <>
          {/* Filtros y Búsqueda */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
            <div className="flex flex-col gap-4">
              {/* Búsqueda y botones de exportación */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por instrumento, mercado, período o tipo..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm lg:text-base"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={isExporting || filteredQualifications.length === 0}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Icons.Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting || filteredQualifications.length === 0}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>

              {/* Filtros avanzados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <select
                  value={filterMarket}
                  onChange={(e) => {
                    setFilterMarket(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
                >
                  <option value="">Todos los mercados</option>
                  {uniqueMarkets.map(market => (
                    <option key={market} value={market}>{market}</option>
                  ))}
                </select>

                <select
                  value={filterPeriod}
                  onChange={(e) => {
                    setFilterPeriod(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
                >
                  <option value="">Todos los períodos</option>
                  {uniquePeriods.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Monto mínimo"
                  value={filterMinAmount}
                  onChange={(e) => {
                    setFilterMinAmount(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
                />

                <input
                  type="number"
                  placeholder="Monto máximo"
                  value={filterMaxAmount}
                  onChange={(e) => {
                    setFilterMaxAmount(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
                />

                <button
                  onClick={clearFilters}
                  className="px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors text-sm lg:text-base flex items-center justify-center gap-2"
                >
                  <Icons.Close className="w-4 h-4" />
                  Limpiar
                </button>
              </div>

              {/* Resumen de filtros activos */}
              {(searchTerm || filterMarket || filterPeriod || filterMinAmount || filterMaxAmount) && (
                <div className="text-xs text-gray-400">
                  Mostrando {filteredQualifications.length} de {qualifications.length} calificaciones
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Calificaciones */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-lg lg:text-xl font-bold">Calificaciones Tributarias</h2>
              <span className="text-xs lg:text-sm text-gray-400">
                {filteredQualifications.length} registro{filteredQualifications.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Vista móvil */}
            <div className="block lg:hidden space-y-3">
              {paginatedQualifications.map((qual) => (
                <div key={qual.id} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm">{qual.tipoInstrumento}</h3>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-400">{qual.mercadoOrigen}</span>
                      <button
                        onClick={() => handleEdit(qual)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        aria-label="Editar"
                      >
                        <Icons.Edit className="w-4 h-4 text-orange-400" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Período:</span>
                      <span className="ml-1">{qual.periodo}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tipo:</span>
                      <span className="ml-1">{qual.tipoCalificacion || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Factores:</span>
                      <span className="ml-1">{formatFactors(qual.factores)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Monto:</span>
                      <span className="ml-1">{formatAmount(qual.monto)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Actualizado:</span>
                      <span className="ml-1">{qual.fechaUltimaModificacion.toLocaleDateString('es-CL')}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">No Inscrita:</span>
                      <span className="ml-1">{qual.esNoInscrita ? 'Sí' : 'No'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vista escritorio */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm">Tipo de Instrumento</th>
                      <th className="text-left py-3 px-4 text-sm">Mercado de Origen</th>
                      <th className="text-left py-3 px-4 text-sm">Período</th>
                      <th className="text-left py-3 px-4 text-sm">Tipo</th>
                      <th className="text-left py-3 px-4 text-sm">Factores</th>
                      <th className="text-left py-3 px-4 text-sm">Monto</th>
                      <th className="text-left py-3 px-4 text-sm">No Inscrita</th>
                      <th className="text-left py-3 px-4 text-sm">Última Act.</th>
                      <th className="text-left py-3 px-4 text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQualifications.map((qual) => (
                      <tr key={qual.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-sm">{qual.tipoInstrumento}</td>
                        <td className="py-3 px-4 text-sm">{qual.mercadoOrigen}</td>
                        <td className="py-3 px-4 text-sm">{qual.periodo}</td>
                        <td className="py-3 px-4 text-sm">{qual.tipoCalificacion || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm">{formatFactors(qual.factores)}</td>
                        <td className="py-3 px-4 text-sm">{formatAmount(qual.monto)}</td>
                        <td className="py-3 px-4 text-sm">
                          {qual.esNoInscrita ? (
                            <span className="text-yellow-400">⚠</span>
                          ) : (
                            <span className="text-green-400">✓</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {qual.fechaUltimaModificacion.toLocaleDateString('es-CL')}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => handleEdit(qual)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Editar"
                          >
                            <Icons.Edit className="w-4 h-4 text-orange-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 lg:mt-6 pt-4 border-t border-white/10 gap-2">
                <span className="text-xs lg:text-sm text-gray-400">
                  Mostrando {startIndex + 1} - {Math.min(endIndex, filteredQualifications.length)} de {filteredQualifications.length} registros
                </span>
                <div className="flex gap-1 lg:gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 lg:px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-xs lg:text-sm"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar primera, última, actual y adyacentes
                      return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                    })
                    .map((page, idx, arr) => {
                      // Agregar elipsis si hay gap
                      const showEllipsis = idx > 0 && arr[idx - 1] !== page - 1
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-gray-400">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 lg:px-3 py-1 rounded-lg text-xs lg:text-sm transition-colors ${
                              currentPage === page
                                ? 'bg-orange-600/20 text-orange-300'
                                : 'bg-white/10 hover:bg-white/20'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      )
                    })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 lg:px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-xs lg:text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal de edición */}
          <EditQualificationModal
            qualification={editingQual}
            isOpen={editingQual !== null}
            onClose={() => setEditingQual(null)}
            onSave={handleSaveEdit}
          />
        </>
      )}
    </div>
  )
}

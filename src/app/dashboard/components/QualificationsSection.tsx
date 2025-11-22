'use client'

/**
 * Componente QualificationsSection
 * 
 * Sección principal para gestionar calificaciones tributarias. Permite crear, editar,
 * eliminar, buscar y filtrar calificaciones. Incluye búsqueda por texto libre, filtros
 * combinables por mercado, período y rango de montos, paginación configurable y exportación
 * a CSV y Excel. Todos los datos se cargan desde Firestore con paginación automática.
 * 
 * MEJORAS:
 * - Ordenamiento por columnas
 * - Acciones masivas (Eliminar seleccionados)
 * - Filtro por estado (Oficial / No Inscrita)
 * - Indicadores visuales de estado mejorados
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { TaxQualification, ActiveTab } from './types'
import { getQualificationsByBrokerId, searchQualifications, deleteQualification } from '../../services/firestoreService'
import { exportToCSV, exportToExcel } from '../../services/exportService'
import { logQualificationDeleted } from '../../services/auditService'
import { useAuth } from '../../context/AuthContext'
import { validateAndFormatRUT } from '../../utils/rutUtils'
import { useDebounce } from '../../hooks/useDebounce'
import { useFirestoreCache } from '../../hooks/useFirestoreCache'
import { sanitizeString } from '../../utils/sanitize'
import EditQualificationModal from './EditQualificationModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import LoadingSpinner from '../../components/LoadingSpinner'
import Icons from '../../utils/icons'
import CustomDropdown from '../../components/CustomDropdown'
import { useDashboard } from '../../context/DashboardContext'

interface QualificationsSectionProps {
  brokerId?: string
  setActiveTab: (tab: ActiveTab) => void
  pageSize: number
  dateFormat?: string // Formato de fecha del usuario
}

type SortField = 'rutContribuyente' | 'tipoInstrumento' | 'mercadoOrigen' | 'periodo' | 'tipoCalificacion' | 'monto' | 'esNoInscrita' | 'fechaUltimaModificacion';
type SortDirection = 'asc' | 'desc';

function QualificationsSection({
  brokerId = 'broker-demo-001',
  setActiveTab,
  pageSize,
  dateFormat = 'DD/MM/AAAA'
}: QualificationsSectionProps) {
  const { userProfile } = useAuth()
  const { setCurrentData } = useDashboard();
  const [qualifications, setQualifications] = useState<TaxQualification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [filterMarket, setFilterMarket] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterStatus, setFilterStatus] = useState('') // '' | 'official' | 'unofficial'
  const [filterMinAmount, setFilterMinAmount] = useState('')
  const [filterMaxAmount, setFilterMaxAmount] = useState('')

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>('fechaUltimaModificacion')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Paginación y Selección
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modales
  const [editingQual, setEditingQual] = useState<TaxQualification | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingQual, setDeletingQual] = useState<TaxQualification | null>(null) // Para eliminación individual
  const [isBulkDeleting, setIsBulkDeleting] = useState(false) // Para confirmación masiva

  // Estados de carga
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar calificaciones desde Firestore con caché
  const { data: cachedQualifications, loading: cacheLoading, error: cacheError, invalidateCache } = useFirestoreCache<TaxQualification[]>(
    `qualifications-${brokerId}`,
    () => {
      if (!brokerId) {
        return Promise.resolve([])
      }
      return getQualificationsByBrokerId(brokerId, 0)
    },
    5 * 60 * 1000 // 5 minutos de caché
  )

  useEffect(() => {
    if (cachedQualifications) {
      setQualifications(cachedQualifications)
      setLoading(false)
    } else if (cacheLoading) {
      setLoading(true)
    } else if (cacheError) {
      setError('Error al cargar las calificaciones. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }, [cachedQualifications, cacheLoading, cacheError])

  // Listener para recargar después de ediciones (invalida caché)
  useEffect(() => {
    const handleReload = () => {
      invalidateCache()
      setSelectedIds(new Set()) // Limpiar selección al recargar
    }
    window.addEventListener('reloadQualifications', handleReload)
    return () => {
      window.removeEventListener('reloadQualifications', handleReload)
    }
  }, [invalidateCache])

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

  // Filtrar y Ordenar calificaciones
  const processedQualifications = useMemo(() => {
    let result = [...qualifications]

    // 1. Filtrado
    if (debouncedSearchTerm) {
      const term = sanitizeString(debouncedSearchTerm).toLowerCase()
      result = result.filter(q =>
        q.tipoInstrumento.toLowerCase().includes(term) ||
        q.mercadoOrigen.toLowerCase().includes(term) ||
        q.periodo.toLowerCase().includes(term) ||
        (q.tipoCalificacion && q.tipoCalificacion.toLowerCase().includes(term)) ||
        (q.rutContribuyente && q.rutContribuyente.toLowerCase().includes(term))
      )
    }

    if (filterMarket) {
      result = result.filter(q => q.mercadoOrigen === filterMarket)
    }

    if (filterPeriod) {
      result = result.filter(q => q.periodo === filterPeriod)
    }

    if (filterStatus) {
      const isNoInscrita = filterStatus === 'unofficial'
      result = result.filter(q => q.esNoInscrita === isNoInscrita)
    }

    if (filterMinAmount) {
      const min = parseFloat(filterMinAmount)
      if (!isNaN(min)) {
        result = result.filter(q => q.monto.valor >= min)
      }
    }

    if (filterMaxAmount) {
      const max = parseFloat(filterMaxAmount)
      if (!isNaN(max)) {
        result = result.filter(q => q.monto.valor <= max)
      }
    }

    // 2. Ordenamiento
    result.sort((a, b) => {
      let valA: any = a[sortField as keyof TaxQualification];
      let valB: any = b[sortField as keyof TaxQualification];

      // Casos especiales
      if (sortField === 'monto') {
        valA = a.monto.valor;
        valB = b.monto.valor;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result
  }, [qualifications, debouncedSearchTerm, filterMarket, filterPeriod, filterStatus, filterMinAmount, filterMaxAmount, sortField, sortDirection])

  // Update global dashboard context with current data
  useEffect(() => {
    setCurrentData(processedQualifications);
  }, [processedQualifications, setCurrentData]);

  // Paginación
  const totalPages = Math.ceil(processedQualifications.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedQualifications = processedQualifications.slice(startIndex, endIndex)

  // Manejo de Selección
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(processedQualifications.map(q => q.id))
      setSelectedIds(allIds)
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // Manejo de Ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <Icons.ChevronUp className="w-3 h-3 opacity-30" />
    return sortDirection === 'asc'
      ? <Icons.ChevronUp className="w-3 h-3 text-orange-500" />
      : <Icons.ChevronDown className="w-3 h-3 text-orange-500" />
  }

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

  // Exportar a CSV (memoizado)
  const handleExportCSV = useCallback(() => {
    setIsExporting(true)
    try {
      // Exportar SOLO los seleccionados si hay selección, sino todos los filtrados
      const dataToExport = selectedIds.size > 0
        ? processedQualifications.filter(q => selectedIds.has(q.id))
        : processedQualifications;

      exportToCSV(dataToExport, 'calificaciones_tributarias')
    } catch (error) {
      console.error('Error exportando CSV:', error)
      setError('Error al exportar CSV')
    } finally {
      setIsExporting(false)
    }
  }, [processedQualifications, selectedIds])

  // Exportar a Excel (memoizado)
  const handleExportExcel = useCallback(() => {
    setIsExporting(true)
    try {
      const dataToExport = selectedIds.size > 0
        ? processedQualifications.filter(q => selectedIds.has(q.id))
        : processedQualifications;

      exportToExcel(dataToExport, 'calificaciones_tributarias')
    } catch (error) {
      console.error('Error exportando Excel:', error)
      setError('Error al exportar Excel')
    } finally {
      setIsExporting(false)
    }
  }, [processedQualifications, selectedIds])

  // Manejar edición (memoizado)
  const handleEdit = useCallback((qual: TaxQualification) => {
    setEditingQual(qual)
  }, [])

  const handleSaveEdit = () => {
    window.dispatchEvent(new Event('reloadQualifications'))
    window.dispatchEvent(new Event('reloadBrokerStats'))
    setEditingQual(null)
    setIsCreating(false)
  }

  // Manejar eliminación individual
  const handleDeleteClick = useCallback((qual: TaxQualification) => {
    setDeletingQual(qual)
  }, [])

  // Manejar eliminación masiva
  const handleBulkDeleteClick = () => {
    setIsBulkDeleting(true)
  }

  const handleConfirmDelete = useCallback(async () => {
    if ((!deletingQual && !isBulkDeleting) || !userProfile) {
      setDeletingQual(null)
      setIsBulkDeleting(false)
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const idsToDelete = isBulkDeleting
        ? Array.from(selectedIds)
        : [deletingQual!.id];

      // Eliminar secuencialmente (podría mejorarse con Promise.all pero Firestore tiene límites)
      for (const id of idsToDelete) {
        const qual = qualifications.find(q => q.id === id);
        if (qual) {
          await deleteQualification(id);
          await logQualificationDeleted(
            userProfile.uid,
            userProfile.email || '',
            `${userProfile.Nombre || ''} ${userProfile.Apellido || ''}`.trim() || 'Usuario',
            id,
            qual
          );
        }
      }

      window.dispatchEvent(new Event('reloadQualifications'))
      window.dispatchEvent(new Event('reloadBrokerStats'))
      setDeletingQual(null)
      setIsBulkDeleting(false)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error eliminando calificación:', error)
      setError('Error al eliminar calificación(es)')
    } finally {
      setIsDeleting(false)
    }
  }, [deletingQual, isBulkDeleting, selectedIds, userProfile, qualifications])

  const handleCancelDelete = () => {
    setDeletingQual(null)
    setIsBulkDeleting(false)
  }

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('')
    setFilterMarket('')
    setFilterPeriod('')
    setFilterStatus('')
    setFilterMinAmount('')
    setFilterMaxAmount('')
    setCurrentPage(1)
    setSelectedIds(new Set())
  }

  if (loading) {
    return (
      <div className="space-y-4 lg:space-y-6">
        <LoadingSpinner />
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
              {/* Búsqueda y botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por RUT, instrumento, mercado..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(sanitizeString(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="w-full px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDeleteClick}
                      className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Icons.Delete className="w-4 h-4" />
                      Eliminar ({selectedIds.size})
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsCreating(true)
                      setEditingQual(null)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <Icons.Add className="w-4 h-4" />
                    Nueva
                  </button>
                  <button
                    onClick={handleExportCSV}
                    disabled={isExporting || processedQualifications.length === 0}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Icons.Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting || processedQualifications.length === 0}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <Icons.Download className="w-4 h-4" />
                    Excel
                  </button>
                </div>
              </div>

              {/* Filtros avanzados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <CustomDropdown
                  value={filterMarket}
                  onChange={(val) => { setFilterMarket(val as string); setCurrentPage(1); }}
                  options={[{ value: "", label: "Todos los mercados" }, ...uniqueMarkets.map(m => ({ value: m, label: m }))]}
                />

                <CustomDropdown
                  value={filterPeriod}
                  onChange={(val) => { setFilterPeriod(val as string); setCurrentPage(1); }}
                  options={[{ value: "", label: "Todos los períodos" }, ...uniquePeriods.map(p => ({ value: p, label: p }))]}
                />

                <CustomDropdown
                  value={filterStatus}
                  onChange={(val) => { setFilterStatus(val as string); setCurrentPage(1); }}
                  options={[
                    { value: "", label: "Todos los estados" },
                    { value: "official", label: "Oficiales" },
                    { value: "unofficial", label: "No Inscritas" }
                  ]}
                />

                <input
                  type="number"
                  placeholder="Monto mín."
                  value={filterMinAmount}
                  onChange={(e) => { setFilterMinAmount(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />

                <input
                  type="number"
                  placeholder="Monto máx."
                  value={filterMaxAmount}
                  onChange={(e) => { setFilterMaxAmount(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />

                <button
                  onClick={clearFilters}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Close className="w-4 h-4" />
                  Limpiar
                </button>
              </div>

              {/* Resumen */}
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Mostrando {processedQualifications.length} de {qualifications.length} registros</span>
                {selectedIds.size > 0 && <span className="text-orange-400 font-medium">{selectedIds.size} seleccionados</span>}
              </div>
            </div>
          </div>

          {/* Tabla de Calificaciones */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
            {/* Vista móvil */}
            <div className="block lg:hidden space-y-3">
              {paginatedQualifications.map((qual) => (
                <div key={qual.id} className={`bg-white/5 rounded-xl p-3 border ${selectedIds.has(qual.id) ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(qual.id)}
                        onChange={() => handleSelectRow(qual.id)}
                        className="rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-800"
                      />
                      <h3 className="font-semibold text-sm">{qual.tipoInstrumento}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(qual)} className="p-1 hover:bg-white/10 rounded"><Icons.Edit className="w-4 h-4 text-orange-400" /></button>
                      <button onClick={() => handleDeleteClick(qual)} className="p-1 hover:bg-white/10 rounded"><Icons.Delete className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400">RUT:</span> {qual.rutContribuyente || 'N/A'}</div>
                    <div><span className="text-gray-400">Monto:</span> {formatAmount(qual.monto)}</div>
                    <div>
                      <span className="text-gray-400">Estado:</span>
                      <span className={`ml-1 ${qual.esNoInscrita ? 'text-yellow-400' : 'text-green-400'}`}>
                        {qual.esNoInscrita ? 'No Inscrita' : 'Oficial'}
                      </span>
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
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={processedQualifications.length > 0 && selectedIds.size === processedQualifications.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-800"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('rutContribuyente')}>
                        <div className="flex items-center gap-1">RUT <SortIcon field="rutContribuyente" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('tipoInstrumento')}>
                        <div className="flex items-center gap-1">Instrumento <SortIcon field="tipoInstrumento" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('mercadoOrigen')}>
                        <div className="flex items-center gap-1">Mercado <SortIcon field="mercadoOrigen" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('periodo')}>
                        <div className="flex items-center gap-1">Período <SortIcon field="periodo" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm">Factores</th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('monto')}>
                        <div className="flex items-center gap-1">Monto <SortIcon field="monto" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('esNoInscrita')}>
                        <div className="flex items-center gap-1">Estado <SortIcon field="esNoInscrita" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm cursor-pointer hover:text-orange-400 group" onClick={() => handleSort('fechaUltimaModificacion')}>
                        <div className="flex items-center gap-1">Fecha <SortIcon field="fechaUltimaModificacion" /></div>
                      </th>
                      <th className="text-left py-3 px-4 text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQualifications.map((qual) => (
                      <tr key={qual.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${selectedIds.has(qual.id) ? 'bg-orange-500/5' : ''}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(qual.id)}
                            onChange={() => handleSelectRow(qual.id)}
                            className="rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-800"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-gray-300">
                          {qual.rutContribuyente ? validateAndFormatRUT(qual.rutContribuyente).formatted : <span className="text-gray-600">-</span>}
                        </td>
                        <td className="py-3 px-4 text-sm">{qual.tipoInstrumento}</td>
                        <td className="py-3 px-4 text-sm">{qual.mercadoOrigen}</td>
                        <td className="py-3 px-4 text-sm">{qual.periodo}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">{formatFactors(qual.factores)}</td>
                        <td className="py-3 px-4 text-sm font-medium">{formatAmount(qual.monto)}</td>
                        <td className="py-3 px-4 text-sm">
                          {qual.esNoInscrita ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              No Inscrita
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                              Oficial
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {qual.fechaUltimaModificacion.toLocaleDateString('es-CL')}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(qual)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Editar">
                              <Icons.Edit className="w-4 h-4 text-orange-400" />
                            </button>
                            <button onClick={() => handleDeleteClick(qual)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Eliminar">
                              <Icons.Delete className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
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
                  Mostrando {startIndex + 1} - {Math.min(endIndex, processedQualifications.length)} de {processedQualifications.length} registros
                </span>
                <div className="flex gap-1 lg:gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 lg:px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 text-xs lg:text-sm"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => (
                      <div key={page} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== page - 1 && <span className="text-gray-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-2 lg:px-3 py-1 rounded-lg text-xs lg:text-sm transition-colors ${currentPage === page ? 'bg-orange-600/20 text-orange-300' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 lg:px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 text-xs lg:text-sm"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modales */}
          <EditQualificationModal
            qualification={editingQual}
            isOpen={editingQual !== null || isCreating}
            onClose={() => { setEditingQual(null); setIsCreating(false); }}
            onSave={handleSaveEdit}
            mode={isCreating || (editingQual && !editingQual.id) ? 'create' : 'edit'}
            dateFormat={dateFormat}
          />

          <ConfirmDialog
            isOpen={deletingQual !== null || isBulkDeleting}
            title={isBulkDeleting ? "Eliminar Calificaciones" : "Confirmar Eliminación"}
            message={
              isBulkDeleting
                ? `¿Estás seguro de que deseas eliminar ${selectedIds.size} calificaciones seleccionadas? Esta acción no se puede deshacer.`
                : deletingQual
                  ? `¿Estás seguro de que deseas eliminar la calificación de ${deletingQual.tipoInstrumento}?`
                  : ''
            }
            confirmText="Eliminar"
            cancelText="Cancelar"
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            variant="danger"
          />
        </>
      )}
    </div>
  )
}

export default memo(QualificationsSection)

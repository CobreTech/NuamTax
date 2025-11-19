'use client'

/**
 * Componente ReportsSection (Sección de Reportes)
 * 
 * Esta sección proporciona la interfaz para que los usuarios generen diferentes tipos
 * de reportes tributarios. Incluye filtros para acotar los datos y tarjetas que
 * representan cada tipo de reporte disponible.
 * 
 * Funcionalidades:
 * - Panel de filtros por evento de capital y rango de fechas (funcional)
 * - Generación de reporte DJ1948 en PDF, XML, CSV y Excel
 * - Otros reportes (pendientes de implementación)
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getQualificationsByBrokerId } from '../../services/firestoreService'
import { TaxQualification } from './types'
import { generateDJ1948PDF, generateDJ1948CSV, generateDJ1948Excel, getContribuyentesFromQualifications } from '../../services/dj1948Service'
import { logDataExport } from '../../services/auditService'
import { validateAndFormatRUT } from '../../utils/rutUtils'
import Icons from '../../utils/icons'
import CustomDropdown from '../../components/CustomDropdown'
import CustomDatePicker from '../../components/CustomDatePicker'

export default function ReportsSection() {
  const { userProfile } = useAuth()
  const [qualifications, setQualifications] = useState<TaxQualification[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  // Filtros
  const [eventFilter, setEventFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [anioTributario, setAnioTributario] = useState(new Date().getFullYear().toString())

  // Datos adicionales para DJ1948
  const [showDJ1948Modal, setShowDJ1948Modal] = useState(false)
  const [contribuyentes, setContribuyentes] = useState<Array<{ rut: string; count: number; rutClean?: string }>>([])
  const [selectedContribuyente, setSelectedContribuyente] = useState<string>('')
  const [rutReceptorFormatted, setRutReceptorFormatted] = useState('')
  const [rutReceptorError, setRutReceptorError] = useState<string | null>(null)
  const [dj1948Data, setDj1948Data] = useState({
    domicilio: '',
    comuna: '',
    telefono: '',
    rutReceptor: '',
    cantidadAcciones: 0,
    tipoPropietario: 2 as 1 | 2,
    nombreContribuyente: '',
  })

  // Cargar calificaciones
  useEffect(() => {
    const loadQualifications = async () => {
      if (!userProfile?.uid) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const data = await getQualificationsByBrokerId(userProfile.uid, 1000)
        setQualifications(data)

        // Detectar contribuyentes únicos
        const contribs = getContribuyentesFromQualifications(data)
        setContribuyentes(contribs)

        // Si hay un solo contribuyente, seleccionarlo automáticamente
        if (contribs.length === 1) {
          setSelectedContribuyente(contribs[0].rutClean || contribs[0].rut)
        }

        // Inicializar RUT receptor con el RUT del usuario si existe
        if (userProfile.Rut) {
          const rutResult = validateAndFormatRUT(userProfile.Rut)
          if (rutResult.isValid) {
            setRutReceptorFormatted(rutResult.formatted)
            setDj1948Data(prev => ({ ...prev, rutReceptor: rutResult.clean }))
          }
        }
      } catch (error) {
        console.error('Error cargando calificaciones para reportes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQualifications()
  }, [userProfile?.uid, userProfile?.Rut])

  // Filtrar calificaciones según filtros aplicados
  const filteredQualifications = qualifications.filter(qual => {
    // Filtro por fecha
    if (dateFrom) {
      const qualDate = new Date(qual.fechaUltimaModificacion)
      const fromDate = new Date(dateFrom)
      if (qualDate < fromDate) return false
    }
    if (dateTo) {
      const qualDate = new Date(qual.fechaUltimaModificacion)
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      if (qualDate > toDate) return false
    }

    // Filtro por evento de capital (por tipo de calificación)
    if (eventFilter) {
      const tipoCalif = qual.tipoCalificacion?.toLowerCase() || ''
      if (eventFilter === 'dividend' && !tipoCalif.includes('dividendo')) return false
      if (eventFilter === 'split' && !tipoCalif.includes('división')) return false
      if (eventFilter === 'merger' && !tipoCalif.includes('fusión')) return false
    }

    return true
  })

  // Generar DJ1948 en formato específico
  const handleGenerateDJ1948 = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!userProfile || filteredQualifications.length === 0) {
      alert('No hay calificaciones disponibles para generar el reporte')
      return
    }

    setGenerating(format)
    try {
      // Validar RUT receptor si se ingresó
      if (rutReceptorFormatted && rutReceptorFormatted.trim() !== '') {
        const rutValidation = validateAndFormatRUT(rutReceptorFormatted)
        if (!rutValidation.isValid) {
          alert('El RUT receptor ingresado no es válido. Por favor, corríjalo antes de generar el reporte.')
          setRutReceptorError('RUT inválido. Formato: 11.111.111-1 o 11111111-1')
          setGenerating(null)
          return
        }
      }

      // Usar datos adicionales si están disponibles, sino usar valores por defecto
      const rutReceptorClean = dj1948Data.rutReceptor || (userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).clean : '')

      const additionalData = {
        domicilio: dj1948Data.domicilio || undefined,
        comuna: dj1948Data.comuna || undefined,
        telefono: dj1948Data.telefono || undefined,
        rutReceptor: rutReceptorClean,
        cantidadAcciones: dj1948Data.cantidadAcciones || 0,
        tipoPropietario: dj1948Data.tipoPropietario,
        nombreContribuyente: dj1948Data.nombreContribuyente,
      }

      // Determinar RUT del contribuyente para el reporte
      const rutContribuyente = selectedContribuyente || undefined

      switch (format) {
        case 'pdf':
          generateDJ1948PDF(filteredQualifications, userProfile, anioTributario, rutContribuyente, additionalData)
          break
        case 'csv':
          generateDJ1948CSV(filteredQualifications, userProfile, anioTributario, rutContribuyente, additionalData)
          break
        case 'excel':
          generateDJ1948Excel(filteredQualifications, userProfile, anioTributario, rutContribuyente, additionalData)
          break
      }

      // Registrar log de auditoría
      await logDataExport(
        userProfile.uid,
        userProfile.email || '',
        `${userProfile.Nombre} ${userProfile.Apellido}`,
        `DJ1948-${format.toUpperCase()}`,
        filteredQualifications.length
      )

      setShowDJ1948Modal(false)
    } catch (error) {
      console.error('Error generando reporte DJ1948:', error)
      alert('Error al generar el reporte. Por favor, intenta nuevamente.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* --- PANEL DE FILTROS --- */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6 relative z-30">
        <h2 className="text-lg lg:text-xl font-bold mb-4">Filtros de Reporte</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <div>
            <div>
              <CustomDropdown
                label="Evento de Capital"
                value={eventFilter}
                onChange={(val) => setEventFilter(val as string)}
                options={[
                  { value: "", label: "Todos los eventos" },
                  { value: "dividend", label: "Dividendos" },
                  { value: "split", label: "División de acciones" },
                  { value: "merger", label: "Fusión" },
                ]}
              />
            </div>
          </div>
          <div>
            <CustomDatePicker
              label="Fecha Desde"
              value={dateFrom}
              onChange={setDateFrom}
            />
          </div>
          <div>
            <CustomDatePicker
              label="Fecha Hasta"
              value={dateTo}
              onChange={setDateTo}
            />
          </div>
          <div>
            <label htmlFor="anio-tributario" className="block text-xs lg:text-sm font-medium mb-2">Año Tributario</label>
            <input
              id="anio-tributario"
              type="number"
              value={anioTributario}
              onChange={(e) => setAnioTributario(e.target.value)}
              min="2020"
              max={new Date().getFullYear() + 1}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white placeholder-gray-400 transition-all duration-200"
            />
          </div>
        </div>
        {filteredQualifications.length > 0 && (
          <div className="mt-4 text-sm text-gray-300">
            {filteredQualifications.length} calificación(es) disponible(s) para el reporte
          </div>
        )}
      </div>

      {/* --- TARJETAS DE REPORTES --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
        {/* Reporte DJ1948 - FUNCIONAL */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="flex items-start justify-between mb-3 lg:mb-4">
            <div>
              <h3 className="text-sm lg:text-lg font-semibold">Reporte DJ1948</h3>
              <p className="text-xs lg:text-sm text-gray-400">Declaración jurada según formato oficial SII</p>
            </div>
            <Icons.File className="w-8 h-8 lg:w-10 lg:h-10 text-purple-400" />
          </div>

          {loading ? (
            <div className="text-center py-4 text-gray-400">Cargando calificaciones...</div>
          ) : filteredQualifications.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-xs">
              No hay calificaciones disponibles con los filtros aplicados
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setShowDJ1948Modal(true)}
                className="w-full px-3 lg:px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all text-xs lg:text-sm font-semibold"
              >
                Generar DJ1948
              </button>
              <div className="text-xs text-gray-400 text-center">
                {filteredQualifications.length} registro(s) incluido(s)
              </div>
            </div>
          )}
        </div>

        {/* Otros reportes - Pendientes */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="flex items-start justify-between mb-3 lg:mb-4">
            <div>
              <h3 className="text-sm lg:text-lg font-semibold">Calificaciones por Evento de Capital</h3>
              <p className="text-xs lg:text-sm text-gray-400">Reporte detallado de calificaciones agrupadas por evento</p>
            </div>
            <Icons.BarChart className="w-8 h-8 lg:w-10 lg:h-10 text-orange-400" />
          </div>
          <button
            onClick={() => alert('Pendiente de implementación')}
            className="w-full px-3 lg:px-4 py-2 bg-gray-600/50 text-gray-400 rounded-xl cursor-not-allowed text-xs lg:text-sm"
            disabled
          >
            Generar PDF (Próximamente)
          </button>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="flex items-start justify-between mb-3 lg:mb-4">
            <div>
              <h3 className="text-sm lg:text-lg font-semibold">Resumen por Período</h3>
              <p className="text-xs lg:text-sm text-gray-400">Consolidado trimestral de calificaciones tributarias</p>
            </div>
            <Icons.TrendingUp className="w-8 h-8 lg:w-10 lg:h-10 text-green-400" />
          </div>
          <button
            onClick={() => alert('Pendiente de implementación')}
            className="w-full px-3 lg:px-4 py-2 bg-gray-600/50 text-gray-400 rounded-xl cursor-not-allowed text-xs lg:text-sm"
            disabled
          >
            Generar PDF (Próximamente)
          </button>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="flex items-start justify-between mb-3 lg:mb-4">
            <div>
              <h3 className="text-sm lg:text-lg font-semibold">Factores por Instrumento</h3>
              <p className="text-xs lg:text-sm text-gray-400">Análisis de factores F8-F19 por tipo de instrumento</p>
            </div>
            <Icons.ClipboardList className="w-8 h-8 lg:w-10 lg:h-10 text-blue-400" />
          </div>
          <button
            onClick={() => alert('Pendiente de implementación')}
            className="w-full px-3 lg:px-4 py-2 bg-gray-600/50 text-gray-400 rounded-xl cursor-not-allowed text-xs lg:text-sm"
            disabled
          >
            Generar PDF (Próximamente)
          </button>
        </div>
      </div>

      {/* Modal para configurar DJ1948 */}
      {showDJ1948Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Generar Reporte DJ1948</h2>
              <button
                onClick={() => setShowDJ1948Modal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                aria-label="Cerrar"
              >
                <Icons.Close className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Selector de Contribuyente */}
              {contribuyentes.length > 1 && (
                <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                  <CustomDropdown
                    label="Contribuyente para el Reporte *"
                    value={selectedContribuyente}
                    onChange={(val) => setSelectedContribuyente(val as string)}
                    options={[
                      { value: "", label: "Seleccione un contribuyente" },
                      ...contribuyentes.map((contrib) => ({
                        value: contrib.rutClean || contrib.rut,
                        label: `${contrib.rut} (${contrib.count} calificación${contrib.count !== 1 ? 'es' : ''})`
                      }))
                    ]}
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    El DJ1948 se genera por contribuyente. Seleccione el contribuyente para el cual generar el reporte.
                  </p>
                </div>
              )}

              {contribuyentes.length === 1 && (
                <div className="mb-4 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                  <p className="text-sm text-gray-200">
                    <strong>Contribuyente detectado:</strong> {contribuyentes[0].rut} ({contribuyentes[0].count} calificación{contribuyentes[0].count !== 1 ? 'es' : ''})
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Domicilio Postal</label>
                  <input
                    type="text"
                    value={dj1948Data.domicilio}
                    onChange={(e) => setDj1948Data({ ...dj1948Data, domicilio: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Comuna</label>
                  <input
                    type="text"
                    value={dj1948Data.comuna}
                    onChange={(e) => setDj1948Data({ ...dj1948Data, comuna: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Teléfono</label>
                  <input
                    type="text"
                    value={dj1948Data.telefono}
                    onChange={(e) => setDj1948Data({ ...dj1948Data, telefono: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">RUT Receptor</label>
                  <input
                    type="text"
                    value={rutReceptorFormatted}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      setRutReceptorFormatted(inputValue)

                      // Validar y formatear en tiempo real
                      if (inputValue.trim() === '') {
                        setDj1948Data({ ...dj1948Data, rutReceptor: '' })
                        setRutReceptorError(null)
                      } else {
                        const rutResult = validateAndFormatRUT(inputValue)
                        setRutReceptorFormatted(rutResult.formatted)

                        if (rutResult.isValid) {
                          setDj1948Data({ ...dj1948Data, rutReceptor: rutResult.clean })
                          setRutReceptorError(null)
                        } else {
                          setRutReceptorError('RUT inválido. Formato: 11.111.111-1 o 11111111-1')
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value.trim()
                      if (inputValue) {
                        const rutResult = validateAndFormatRUT(inputValue)
                        if (rutResult.isValid) {
                          setRutReceptorFormatted(rutResult.formatted)
                          setDj1948Data({ ...dj1948Data, rutReceptor: rutResult.clean })
                          setRutReceptorError(null)
                        }
                      }
                    }}
                    className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${rutReceptorError ? 'border-red-500' : 'border-white/30'
                      }`}
                    placeholder={userProfile?.Rut ? `Ej: ${userProfile.Rut}` : 'Ej: 12.345.678-9 o 12345678-9'}
                  />
                  {rutReceptorError && (
                    <p className="text-red-400 text-xs mt-1">{rutReceptorError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Cantidad de Acciones al 31/12</label>
                  <input
                    type="number"
                    value={dj1948Data.cantidadAcciones}
                    onChange={(e) => setDj1948Data({ ...dj1948Data, cantidadAcciones: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <CustomDropdown
                    label="Tipo de Propietario"
                    value={dj1948Data.tipoPropietario}
                    onChange={(val) => setDj1948Data({ ...dj1948Data, tipoPropietario: parseInt(val as string) as 1 | 2 })}
                    options={[
                      { value: 2, label: "2 - Nudo Propietario" },
                      { value: 1, label: "1 - Usufructuario" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/20 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Seleccionar Formato de Exportación</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleGenerateDJ1948('pdf')}
                  disabled={generating !== null}
                  className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating === 'pdf' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Icons.File className="w-5 h-5" />
                      <span>PDF</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateDJ1948('csv')}
                  disabled={generating !== null}
                  className="px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating === 'csv' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Icons.File className="w-5 h-5" />
                      <span>CSV</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateDJ1948('excel')}
                  disabled={generating !== null}
                  className="px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating === 'excel' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Icons.File className="w-5 h-5" />
                      <span>Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

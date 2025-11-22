'use client'

/**
 * Componente UploadSection (Sección de Carga Masiva) - 100% Funcional
 * 
 * Implementa RF-01: Carga masiva de datos tributarios
 * Implementa RF-02: Resumen de carga masiva
 * Implementa RF-03: Validación automática de factores
 * 
 * Funcionalidades:
 * - Carga de archivos CSV/XLSX mediante input o drag-and-drop
 * - Procesamiento real de archivos con validación de datos
 * - Vista previa de registros antes de guardar
 * - Guardado en Firestore con detección de duplicados
 * - Resumen detallado con errores y éxitos
 */

import { useRef, useState } from 'react'
import { FilePreview, ProcessedRecord, BulkUploadResult, TaxQualification, Contributor, ContributorMatch, UploadMode } from './types'
import { processFile, processFileWithContributors } from '../../services/fileProcessingService'
import { processBulkUpload } from '../../services/firestoreService'
import { logBulkUpload } from '../../services/auditService'
import { useAuth } from '../../context/AuthContext'
import { validateFileSize, validateFileType } from '../../utils/sanitize'
import Icons from '../../utils/icons'
import { useContributors } from '../../hooks/useContributors'
import { batchCreateContributors } from '../../services/contributorMatchingService'
import CustomDropdown from '../../components/CustomDropdown'

interface UploadSectionProps {
  brokerId?: string; // ID del corredor actual (se obtendría del contexto de autenticación)
}

export default function UploadSection({ brokerId = 'broker-demo-001' }: UploadSectionProps) {
  const { userProfile } = useAuth()
  const { contributors, loading: loadingContributors } = useContributors()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null)
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>([])
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'result'>('select')
  const [error, setError] = useState<string | null>(null)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)

  // Contributor-aware upload states
  const [uploadMode, setUploadMode] = useState<UploadMode>('bulk')
  const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null)
  const [autoCreateContributors, setAutoCreateContributors] = useState(true)
  const [contributorMatches, setContributorMatches] = useState<Map<string, ContributorMatch>>(new Map())
  const [contributorStats, setContributorStats] = useState<any>(null)

  // Estados para barra de progreso
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState('')
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [startTime, setStartTime] = useState(0)

  /**
   * Procesa el archivo seleccionado y genera la vista previa
   */
  const handleFileProcess = async (file: File) => {
    setIsProcessing(true)
    setError(null)

    try {
      // Validar tamaño del archivo (máximo 10MB)
      const sizeValidation = validateFileSize(file, 10)
      if (!sizeValidation.isValid) {
        setError(sizeValidation.error || 'El archivo es demasiado grande')
        setIsProcessing(false)
        return
      }

      // Validar tipo de archivo
      const typeValidation = validateFileType(file)
      if (!typeValidation.isValid) {
        setError(typeValidation.error || 'Tipo de archivo no permitido')
        setIsProcessing(false)
        return
      }

      if (!userProfile) {
        setError('No hay usuario autenticado')
        setIsProcessing(false)
        return
      }

      // Procesar con contributor matching
      const result = await processFileWithContributors(
        file,
        userProfile.uid,
        uploadMode,
        selectedContributor || undefined
      )

      setProcessedRecords(result.records)
      setContributorMatches(result.contributorMatches)
      setContributorStats(result.stats)

      // Calcular estadísticas para la vista previa
      const successRecords = result.records.filter(r => r.status === 'success' || r.status === 'updated')
      const errorRecords = result.records.filter(r => r.status === 'error')
      const toBeUpdated = result.records.filter(r => r.isDuplicate).length
      const toBeAdded = successRecords.length - toBeUpdated

      // Generar vista previa con TODOS los registros exitosos
      const previewData = successRecords.map((record) => {
        if (!record.data) return []
        return [
          record.data.tipoInstrumento,
          record.data.mercadoOrigen,
          record.data.periodo,
          record.data.tipoCalificacion || '',
          `${record.data.monto.valor} ${record.data.monto.moneda}`
        ]
      })

      const preview: FilePreview = {
        fileName: file.name,
        size: file.size,
        rows: result.records.length,
        columns: ['Tipo de Instrumento', 'Mercado de Origen', 'Período', 'Tipo de Calificación', 'Monto'],
        preview: previewData,
        summary: {
          added: toBeAdded,
          updated: toBeUpdated,
          errors: errorRecords.length
        },
        validationErrors: errorRecords.flatMap(r => r.errors).slice(0, 10)
      }

      setFilePreview(preview)
      setCurrentStep('preview')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al procesar el archivo'
      setError(errorMessage)
      console.error('Error procesando archivo:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  /**
   * Maneja la selección de archivo desde el diálogo
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.')
        return
      }
      setSelectedFile(file)
      handleFileProcess(file)
    }
  }

  /**
   * Maneja el drag-and-drop
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        if (file.size > 10 * 1024 * 1024) {
          setError('El archivo es demasiado grande. Máximo 10MB.')
          return
        }
        setSelectedFile(file)
        handleFileProcess(file)
      } else {
        setError('Solo se aceptan archivos CSV y XLSX')
      }
    }
  }

  /**
   * Procesa y guarda los datos en Firestore con reporte de progreso
   * RF-01: Carga masiva con actualización de duplicados
   */
  const handleConfirmUpload = async () => {
    if (!processedRecords.length || !userProfile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    setStartTime(Date.now())

    try {
      // Auto-crear contribuyentes si es necesario
      if (uploadMode === 'bulk' && autoCreateContributors && contributorStats && contributorStats.newContributors > 0) {
        setUploadPhase('Creando contribuyentes nuevos...')

        const newMatches = Array.from(contributorMatches.values()).filter(m => !m.exists)

        const createdIds = await batchCreateContributors(newMatches, userProfile.uid, (current, total) => {
          const percentage = Math.round((current / total) * 30) // 30% del progreso total
          setUploadProgress(percentage)
        })

        // Actualizar records con IDs de contribuyentes recién creados
        processedRecords.forEach(record => {
          if (record.data?.rutContribuyente && !record.data.contributorId) {
            const rutRaw = record.data.rutContribuyente.replace(/[^0-9kK]/g, '')
            const newId = createdIds.get(rutRaw)
            if (newId) {
              record.data.contributorId = newId
            }
          }
        })
      }

      // Callback de progreso para bulk upload
      const baseProgress = (uploadMode === 'bulk' && contributorStats?.newContributors > 0) ? 30 : 0
      const onProgress = (current: number, total: number, phase: string) => {
        const percentage = baseProgress + Math.round(((current / total) * (100 - baseProgress)))
        setUploadProgress(percentage)
        setUploadPhase(phase)

        const elapsed = (Date.now() - startTime) / 1000
        const speed = elapsed > 0 ? Math.round(current / elapsed) : 0
        setUploadSpeed(speed)
      }

      const result = await processBulkUpload(processedRecords, brokerId, onProgress)
      setUploadResult(result)
      setCurrentStep('result')

      // Registrar log de auditoría
      if (userProfile) {
        await logBulkUpload(
          userProfile.uid,
          userProfile.email || '',
          `${userProfile.Nombre} ${userProfile.Apellido}`,
          result.totalRecords,
          result.added + result.updated,
          result.errors
        )
      }

      // Recargar estadísticas después de completar (mejora #3)
      if (typeof window !== 'undefined') {
        // Disparar evento personalizado para que el dashboard recargue las estadísticas
        window.dispatchEvent(new Event('reloadBrokerStats'))
        window.dispatchEvent(new Event('reloadQualifications'))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar los datos'
      setError(errorMessage)
      console.error('Error guardando datos:', err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadPhase('')
    }
  }

  /**
   * Exporta errores a CSV (mejora #2)
   */
  const handleExportErrors = () => {
    if (!uploadResult || !uploadResult.errorRecords.length) return

    // Generar CSV con los errores
    let csvContent = 'Fila,Campo,Error,Valor\n'

    uploadResult.errorRecords.forEach(record => {
      record.errors.forEach(error => {
        const row = `${error.row},"${error.field}","${error.message}","${error.value || ''}"\n`
        csvContent += row
      })
    })

    // Descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `errores_carga_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  /**
   * Reinicia el proceso de carga
   */
  const handleReset = () => {
    setSelectedFile(null)
    setFilePreview(null)
    setProcessedRecords([])
    setUploadResult(null)
    setCurrentStep('select')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  /**
   * Descarga una plantilla específica
   */
  const handleDownloadTemplate = (templateType: 'normal' | 'errors' | '5000') => {
    let fileName = '';

    switch (templateType) {
      case 'normal':
        fileName = 'plantilla_carga_masiva.csv';
        break;
      case 'errors':
        fileName = 'plantilla_con_errores.csv';
        break;
      case '5000':
        fileName = 'plantilla_5000_registros.csv';
        break;
    }

    // Crear un link temporal para descargar el archivo desde /public/plantillas
    const link = document.createElement('a');
    link.href = `/plantillas/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowTemplateMenu(false);
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Paso 1: Selección de archivo */}
      {currentStep === 'select' && (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <h2 className="text-lg lg:text-xl font-bold">Carga Masiva de Calificaciones</h2>

            {/* Dropdown de Plantillas */}
            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="text-xs lg:text-sm px-3 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg hover:bg-blue-600/30 transition-all flex items-center gap-2"
              >
                <Icons.Download className="w-4 h-4" />
                Descargar Plantilla
                <span className="text-xs">▼</span>
              </button>

              {showTemplateMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => handleDownloadTemplate('normal')}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10"
                  >
                    <div className="font-semibold text-sm flex items-center gap-2"><Icons.File className="w-4 h-4" /> Plantilla Normal</div>
                    <div className="text-xs text-gray-400">8 registros de ejemplo</div>
                  </button>

                  <button
                    onClick={() => handleDownloadTemplate('errors')}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/10"
                  >
                    <div className="font-semibold text-sm flex items-center gap-2"><Icons.Warning className="w-4 h-4" /> Plantilla con Errores</div>
                    <div className="text-xs text-gray-400">15 registros para probar validaciones</div>
                  </button>

                  <button
                    onClick={() => handleDownloadTemplate('5000')}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="font-semibold text-sm flex items-center gap-2"><Icons.TrendingUp className="w-4 h-4" /> Plantilla 5,000 Registros</div>
                    <div className="text-xs text-gray-400">Prueba de rendimiento (0.67 MB)</div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cerrar dropdown al hacer clic fuera */}
          {showTemplateMenu && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTemplateMenu(false)}
            />
          )}

          {/* Mode Selector */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Modo de Carga
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode('bulk')
                    setSelectedContributor(null)
                  }}
                  className={`p-4 border-2 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${uploadMode === 'bulk'
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 hover:border-white/30 text-gray-400'
                    }`}
                >
                  <Icons.Upload className="w-6 h-6" />
                  <div className="text-sm">Carga Masiva</div>
                  <div className="text-xs text-gray-500">Múltiples contribuyentes</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('specific')}
                  className={`p-4 border-2 rounded-xl font-medium transition-all flex flex-col items-center gap-2 ${uploadMode === 'specific'
                    ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                    : 'border-white/10 hover:border-white/30 text-gray-400'
                    }`}
                >
                  <Icons.User className="w-6 h-6" />
                  <div className="text-sm">Contribuyente Específico</div>
                  <div className="text-xs text-gray-500">Un solo contribuyente</div>
                </button>
              </div>
            </div>

            {/* Contributor Dropdown si mode = specific */}
            {uploadMode === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Seleccionar Contribuyente <span className="text-orange-400">*</span>
                </label>
                {loadingContributors ? (
                  <div className="text-sm text-gray-400">Cargando contribuyentes...</div>
                ) : (
                  <CustomDropdown
                    options={contributors.map(c => ({
                      value: c.id,
                      label: `${c.nombre} (${c.rut})`
                    }))}
                    value={selectedContributor?.id || ''}
                    onChange={(id) => {
                      const contrib = contributors.find(c => c.id === id)
                      setSelectedContributor(contrib || null)
                    }}
                    placeholder="Seleccionar contribuyente..."
                  />
                )}
                {uploadMode === 'specific' && !selectedContributor && (
                  <p className="mt-1 text-xs text-amber-400">
                    Debe seleccionar un contribuyente antes de cargar el archivo
                  </p>
                )}
              </div>
            )}

            {/* Auto-create checkbox si mode = bulk */}
            {uploadMode === 'bulk' && (
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateContributors}
                  onChange={(e) => setAutoCreateContributors(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-orange-500 focus:ring-orange-500"
                />
                Crear contribuyentes automáticamente si no existen
              </label>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/30 rounded-xl p-6 lg:p-8 text-center hover:border-orange-500/50 transition-colors"
          >
            <div className="mb-4"><Icons.Upload className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-orange-400" /></div>
            <h3 className="text-base lg:text-lg font-semibold mb-2">Arrastra tu archivo aquí</h3>
            <p className="text-gray-400 mb-4 text-sm lg:text-base">o haz clic para seleccionar</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Seleccionar archivo"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Procesando...' : 'Seleccionar Archivo'}
            </button>
            <p className="text-xs lg:text-xs text-gray-500 mt-4">
              Formatos soportados: CSV, XLSX (máx. 10MB)
            </p>

          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-300 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      )}

      {/* Paso 2: Vista previa y confirmación */}
      {currentStep === 'preview' && filePreview && (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6">Vista Previa y Validación</h2>

          {/* Información del archivo */}
          <div className="bg-white/10 rounded-xl p-3 lg:p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm lg:text-base">{filePreview.fileName}</h4>
                <p className="text-xs lg:text-sm text-gray-400">
                  {(filePreview.size / 1024).toFixed(1)} KB • {filePreview.rows} registros
                </p>
              </div>
              <button
                onClick={handleReset}
                className="text-red-400 hover:text-red-300 focus:outline-none text-lg lg:text-xl"
                aria-label="Cancelar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Resumen de validación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-4">
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 lg:p-4">
              <div className="text-xl lg:text-2xl font-bold text-green-400">{filePreview.summary.added}</div>
              <div className="text-xs lg:text-sm text-green-300">Nuevos Registros</div>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-3 lg:p-4">
              <div className="text-xl lg:text-2xl font-bold text-blue-400">{filePreview.summary.updated}</div>
              <div className="text-xs lg:text-sm text-blue-300">Actualizaciones</div>
            </div>
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 lg:p-4">
              <div className="text-xl lg:text-2xl font-bold text-red-400">{filePreview.summary.errors}</div>
              <div className="text-xs lg:text-sm text-red-300">Errores</div>
            </div>
          </div>

          {/* Contributor Stats - Solo si hay matches */}
          {contributorStats && contributorStats.uniqueContributors > 0 && (
            <div className="mt-4 space-y-4 mb-6">
              <h4 className="font-semibold text-sm lg:text-base">Contribuyentes Detectados</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4">
                  <div className="text-xl lg:text-2xl font-bold text-blue-400">
                    {contributorStats.uniqueContributors}
                  </div>
                  <div className="text-xs lg:text-sm text-blue-300">Total Contribuyentes</div>
                </div>
                <div className="bg-purple-500/20 border border-purple-500/50 rounded-xl p-3 lg:p-4">
                  <div className="text-xl lg:text-2xl font-bold text-purple-400">
                    {contributorStats.existingContributors}
                  </div>
                  <div className="text-xs lg:text-sm text-purple-300">Vinculados (Existentes)</div>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 lg:p-4">
                  <div className="text-xl lg:text-2xl font-bold text-orange-400">
                    {contributorStats.newContributors}
                  </div>
                  <div className="text-xs lg:text-sm text-orange-300">
                    {autoCreateContributors ? 'Se Crearán' : 'Sin Asignar'}
                  </div>
                </div>
              </div>

              {/* Detalles de contribuyentes */}
              {contributorMatches.size > 0 && (
                <details className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4">
                  <summary className="cursor-pointer font-semibold text-sm hover:text-orange-400 transition-colors">
                    Ver detalle de {contributorMatches.size} contribuyente(s) →
                  </summary>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs lg:text-sm">
                      <thead className="border-b border-white/10">
                        <tr>
                          <th className="text-left py-2 px-2 text-gray-400">RUT</th>
                          <th className="text-left py-2 px-2 text-gray-400">Nombre</th>
                          <th className="text-left py-2 px-2 text-gray-400">Estado</th>
                          <th className="text-right py-2 px-2 text-gray-400">Calificaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(contributorMatches.values()).map((match) => (
                          <tr key={match.rutRaw} className="border-b border-white/5">
                            <td className="py-2 px-2">{match.rut}</td>
                            <td className="py-2 px-2">{match.nombre}</td>
                            <td className="py-2 px-2">
                              {match.exists ? (
                                <span className="text-purple-400 text-xs">✓ Existente</span>
                              ) : (
                                <span className="text-orange-400 text-xs">⚡ Nuevo</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right">{match.qualificationCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Vista previa de datos válidos */}
          {filePreview.preview.length > 0 && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-3 lg:p-4 mb-4">
              <h4 className="font-semibold mb-3 lg:mb-4 text-sm lg:text-base flex items-center justify-between">
                <span>Vista Previa Completa</span>
                <span className="text-xs font-normal text-gray-400">
                  {filePreview.preview.length} registros válidos de {filePreview.rows} totales
                </span>
              </h4>
              <div className="overflow-x-auto overflow-y-auto max-h-96 border border-white/10 rounded-lg">
                <table className="w-full text-xs lg:text-sm min-w-[500px]">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-2 lg:px-3 text-gray-400 bg-slate-900/95">#</th>
                      {filePreview.columns.map((col, i) => (
                        <th key={i} className="text-left py-2 px-2 lg:px-3 bg-slate-900/95">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filePreview.preview.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-2 px-2 lg:px-3 text-gray-500 font-mono">{i + 1}</td>
                        {row.map((cell, j) => (
                          <td key={j} className="py-2 px-2 lg:px-3">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>↕️ Usa scroll para ver todos los registros</span>
                <span className="font-semibold text-blue-400">
                  Mostrando {filePreview.preview.length} filas válidas completas
                </span>
              </div>
            </div>
          )}

          {/* Errores de validación */}
          {filePreview.validationErrors && filePreview.validationErrors.length > 0 && (
            <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-3 lg:p-4 mb-4">
              <h4 className="font-semibold mb-3 text-sm lg:text-base text-red-300">
                ⚠️ Errores de Validación (primeros 10)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filePreview.validationErrors.map((error, i) => (
                  <div key={i} className="text-xs bg-black/30 rounded p-2">
                    <span className="text-red-400 font-semibold">Fila {error.row}:</span>
                    <span className="text-gray-300 ml-2">{error.field} - {error.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Progreso (mejora #1) */}
          {isUploading && (
            <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-300">{uploadPhase}</span>
                <span className="text-xs text-gray-400">{uploadProgress}%</span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Estadísticas */}
              <div className="flex justify-between text-xs text-gray-400">
                <span>⚡ {uploadSpeed} reg/seg</span>
                <span>
                  {uploadProgress < 100
                    ? `⏱️ Estimado: ${Math.max(1, Math.round((100 - uploadProgress) / (uploadSpeed / processedRecords.length)))}s`
                    : '✅ Completado'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-between gap-4">
            <button
              onClick={handleReset}
              disabled={isUploading}
              className="px-4 lg:px-6 py-2 lg:py-3 bg-gray-600/50 text-white rounded-xl hover:bg-gray-600/70 transition-all text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={isUploading || filePreview.summary.errors === filePreview.rows}
              className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-500 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Guardando...' : `Confirmar y Guardar (${filePreview.summary.added + filePreview.summary.updated} registros)`}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-300 text-sm">❌ {error}</p>
            </div>
          )}
        </div>
      )}

      {/* Paso 3: Resultado final */}
      {currentStep === 'result' && uploadResult && (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2">Carga Masiva Completada</h2>
            <p className="text-gray-400 text-sm">
              Procesado en {(uploadResult.processingTime / 1000).toFixed(2)} segundos
            </p>
          </div>

          {/* Resumen final */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-3 lg:p-4 text-center">
              <div className="text-xl lg:text-2xl font-bold text-blue-400">{uploadResult.totalRecords}</div>
              <div className="text-xs lg:text-sm text-blue-300">Total Procesados</div>
            </div>
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-3 lg:p-4 text-center">
              <div className="text-xl lg:text-2xl font-bold text-green-400">{uploadResult.added}</div>
              <div className="text-xs lg:text-sm text-green-300">Agregados</div>
            </div>
            <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 lg:p-4 text-center">
              <div className="text-xl lg:text-2xl font-bold text-amber-400">{uploadResult.updated}</div>
              <div className="text-xs lg:text-sm text-amber-300">Actualizados</div>
            </div>
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 lg:p-4 text-center">
              <div className="text-xl lg:text-2xl font-bold text-red-400">{uploadResult.errors}</div>
              <div className="text-xs lg:text-sm text-red-300">Errores</div>
            </div>
          </div>

          {/* Detalle de errores con botón de exportación (mejora #2) */}
          {uploadResult.errorRecords.length > 0 && (
            <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-red-300">Registros con Errores</h4>
                <button
                  onClick={handleExportErrors}
                  className="text-xs px-3 py-1 bg-red-600/30 border border-red-500/50 rounded-lg hover:bg-red-600/50 transition-all flex items-center gap-1"
                >
                  <Icons.Download className="w-4 h-4" />
                  Exportar Errores CSV
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadResult.errorRecords.slice(0, 20).map((record, i) => (
                  <div key={i} className="text-xs bg-black/30 rounded p-2">
                    <span className="text-red-400 font-semibold">Fila {record.rowNumber}:</span>
                    <div className="ml-4 mt-1 space-y-1">
                      {record.errors.map((error, j) => (
                        <div key={j} className="text-gray-300">
                          • {error.field}: {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {uploadResult.errorRecords.length > 20 && (
                  <p className="text-xs text-gray-400 text-center">
                    ... y {uploadResult.errorRecords.length - 20} errores más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Botón para nueva carga */}
          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Nueva Carga
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

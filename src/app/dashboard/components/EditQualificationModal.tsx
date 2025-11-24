'use client'

/**
 * Componente EditQualificationModal
 * 
 * Modal para crear y editar calificaciones tributarias. Implementa ingreso manual
 * de calificaciones con validación en tiempo real de factores tributarios (F8-F19).
 * El campo RUT Contribuyente es obligatorio en modo creación y opcional en modo edición.
 * El campo Período se inicializa automáticamente con la fecha actual formateada
 * según la configuración de preferencias del usuario.
 */

import { useState, useEffect, useRef } from 'react'
import { useFocusTrap, useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import { TaxQualification, TaxFactors, TaxCreditsConfig } from './types'
import { updateQualification, getQualificationById, createQualification } from '../../services/firestoreService'
import { validateFactorsSum } from '../../services/taxValidationService'
import { logQualificationUpdated, logQualificationCreated } from '../../services/auditService'
import { useAuth } from '../../context/AuthContext'
import { validateAndFormatRUT, formatRUT } from '../../utils/rutUtils'
import { formatDate, parseDate, getCurrentDateFormatted, normalizeDateForStorage } from '../../utils/dateUtils'
import Icons from '../../utils/icons'
import CustomDropdown from '../../components/CustomDropdown'
import Portal from '../../components/Portal'

// Alias para el icono X
const X = Icons.Close

interface EditQualificationModalProps {
  qualification: TaxQualification | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  mode?: 'create' | 'edit' // Nuevo: modo de operación
  dateFormat?: string // Formato de fecha del usuario
}

export default function EditQualificationModal({
  qualification,
  isOpen,
  onClose,
  onSave,
  mode = 'edit', // Por defecto es modo edición
  dateFormat = 'DD/MM/AAAA' // Formato de fecha por defecto
}: EditQualificationModalProps) {
  const isCreateMode = mode === 'create'
  const { userProfile } = useAuth()
  const [formData, setFormData] = useState<Partial<TaxQualification>>({})
  const [factores, setFactores] = useState<TaxFactors>({
    factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
    factor14: 0, factor15: 0, factor16: 0
  })
  const [creditosConfig, setCreditosConfig] = useState<TaxCreditsConfig>({
    regimenTributario: '14A',
    tasaIDPC: 0.27,
    anioTributario: new Date().getFullYear(),
    creditoConDevolucion: false,
    creditoSujetoRestitucion: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [factorSum, setFactorSum] = useState(0)
  const [rutContribuyenteFormatted, setRutContribuyenteFormatted] = useState('')
  const [periodoFormatted, setPeriodoFormatted] = useState('') // Período formateado para mostrar
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (isCreateMode || !qualification) {
        // Modo creación: inicializar con valores vacíos
        // Formatear fecha actual según la configuración del usuario
        const currentDateFormatted = getCurrentDateFormatted(dateFormat)
        setFormData({
          tipoInstrumento: '',
          mercadoOrigen: '',
          periodo: '', // Se guardará en formato estándar YYYY-MM-DD
          tipoCalificacion: '',
          monto: { valor: 0, moneda: 'CLP' },
          esNoInscrita: false,
          rutContribuyente: undefined
        })
        setPeriodoFormatted(currentDateFormatted) // Mostrar fecha actual formateada según configuración
        setRutContribuyenteFormatted('')
        setFactores({
          factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
          factor14: 0, factor15: 0, factor16: 0
        })
        setErrors({})
      } else if (qualification) {
        // Modo edición: cargar datos existentes
        setFormData({
          tipoInstrumento: qualification.tipoInstrumento,
          mercadoOrigen: qualification.mercadoOrigen,
          periodo: qualification.periodo,
          tipoCalificacion: qualification.tipoCalificacion,
          monto: qualification.monto,
          esNoInscrita: qualification.esNoInscrita,
          rutContribuyente: qualification.rutContribuyente
        })
        // Formatear período para mostrar según configuración del usuario
        if (qualification.periodo) {
          const periodoDate = parseDate(qualification.periodo, 'AAAA-MM-DD') || new Date(qualification.periodo)
          setPeriodoFormatted(formatDate(periodoDate, dateFormat))
        } else {
          setPeriodoFormatted('')
        }
        // Formatear RUT contribuyente si existe
        if (qualification.rutContribuyente) {
          const rutResult = validateAndFormatRUT(qualification.rutContribuyente)
          setRutContribuyenteFormatted(rutResult.formatted)
        } else {
          setRutContribuyenteFormatted('')
        }
        setFactores(qualification.factores || {
          factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
          factor14: 0, factor15: 0, factor16: 0
        })
        // Cargar configuración de créditos si existe
        if (qualification.creditosConfig) {
          setCreditosConfig(qualification.creditosConfig)
        } else {
          setCreditosConfig({
            regimenTributario: '14A',
            tasaIDPC: 0.27,
            anioTributario: new Date().getFullYear(),
            creditoConDevolucion: false,
            creditoSujetoRestitucion: false
          })
        }
        setErrors({})
      }
    }
  }, [qualification, isOpen, isCreateMode, dateFormat])

  // Calcular suma de factores en tiempo real
  useEffect(() => {
    const sum = Object.values(factores).reduce((acc, val) => acc + val, 0)
    setFactorSum(sum)

    // Validar suma
    const validation = validateFactorsSum(factores)
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, factores: validation.error || 'Suma excede 100%' }))
    } else {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.factores
        return newErrors
      })
    }
  }, [factores])

  const handleFactorChange = (factor: keyof TaxFactors, value: string) => {
    const numValue = parseFloat(value) || 0
    if (numValue < 0 || numValue > 1) return

    setFactores(prev => ({
      ...prev,
      [factor]: numValue
    }))
  }

  const handleInputChange = (field: keyof TaxQualification, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.tipoInstrumento || formData.tipoInstrumento.trim() === '') {
      newErrors.tipoInstrumento = 'El tipo de instrumento es requerido'
    }
    if (!formData.mercadoOrigen || formData.mercadoOrigen.trim() === '') {
      newErrors.mercadoOrigen = 'El mercado de origen es requerido'
    }
    // Validar período: debe estar formateado y ser parseable
    if (!periodoFormatted || periodoFormatted.trim() === '') {
      newErrors.periodo = 'El período es requerido'
    } else {
      // Validar que el período formateado sea una fecha válida
      const parsedDate = parseDate(periodoFormatted, dateFormat)
      if (!parsedDate) {
        newErrors.periodo = `El período no es una fecha válida. Formato esperado: ${dateFormat}`
      }
    }
    if (!formData.monto || formData.monto.valor === undefined || formData.monto.valor === null || formData.monto.valor < 0) {
      newErrors.monto = 'El monto debe ser un número válido mayor o igual a 0'
    }

    // Validar RUT contribuyente: obligatorio en modo creación
    if (isCreateMode) {
      if (!rutContribuyenteFormatted || rutContribuyenteFormatted.trim() === '') {
        newErrors.rutContribuyente = 'El RUT del contribuyente es obligatorio'
      } else {
        // Validar que el RUT sea válido
        const rutResult = validateAndFormatRUT(rutContribuyenteFormatted)
        if (!rutResult.isValid) {
          newErrors.rutContribuyente = 'El RUT del contribuyente no es válido. Formato: 11.111.111-1 o 11111111-1'
        }
      }
    } else {
      // En modo edición, si se proporciona un RUT, debe ser válido
      if (rutContribuyenteFormatted && rutContribuyenteFormatted.trim() !== '') {
        const rutResult = validateAndFormatRUT(rutContribuyenteFormatted)
        if (!rutResult.isValid) {
          newErrors.rutContribuyente = 'El RUT del contribuyente no es válido. Formato: 11.111.111-1 o 11111111-1'
        }
      }
    }

    const validation = validateFactorsSum(factores)
    if (!validation.isValid) {
      newErrors.factores = validation.error || 'La suma de factores supera el 100%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      // Convertir período formateado a formato de almacenamiento YYYY-MM-DD
      const storageDate = normalizeDateForStorage(periodoFormatted, dateFormat)

      const qualificationData: TaxQualification = {
        ...formData as TaxQualification,
        factores,
        creditosConfig,
        periodo: storageDate, // Usar fecha normalizada
        usuarioId: userProfile?.uid || 'unknown',
        fechaCreacion: qualification?.fechaCreacion || new Date(),
        fechaUltimaModificacion: new Date()
      }

      if (isCreateMode) {
        const id = await createQualification(qualificationData)
        // Registrar auditoría de creación
        await logQualificationCreated(
          userProfile?.uid || 'unknown',
          userProfile?.email || 'unknown',
          `${userProfile?.Nombre || ''} ${userProfile?.Apellido || ''}`.trim(),
          id,
          qualificationData
        )
      } else if (qualification?.id) {
        await updateQualification(qualification.id, qualificationData)
        // Registrar auditoría de actualización
        await logQualificationUpdated(
          userProfile?.uid || 'unknown',
          userProfile?.email || 'unknown',
          `${userProfile?.Nombre || ''} ${userProfile?.Apellido || ''}`.trim(),
          qualification.id,
          qualification,
          qualificationData
        )
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving qualification:', error)
      setErrors({ submit: 'Error al guardar la calificación. Intente nuevamente.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Manejo de teclado
  const modalContainerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalContainerRef, isOpen)
  useKeyboardNavigation({
    onEscape: onClose,
    onEnter: (e) => {
      // Solo enviar si no es un textarea o botón
      const target = e.target as HTMLElement
      if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON') {
        handleSubmit(e as any)
      }
    }
  })

  // Foco inicial
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div
          ref={modalContainerRef}
          className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-white">
                {isCreateMode ? 'Nueva Calificación' : 'Editar Calificación'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {isCreateMode
                  ? 'Ingrese los detalles de la nueva calificación tributaria.'
                  : 'Modifique los datos de la calificación existente.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <form id="qualification-form" onSubmit={handleSubmit} className="space-y-8">

              {/* Sección 1: Información General */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <Icons.FileText className="w-5 h-5" />
                  Información General
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tipo de Instrumento */}
                  <div className="space-y-2">
                    <label htmlFor="tipoInstrumento" className="block text-sm font-medium text-gray-300">
                      Tipo de Instrumento <span className="text-orange-500">*</span>
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Acciones', label: 'Acciones' },
                        { value: 'Fondos de Inversión', label: 'Fondos de Inversión' },
                        { value: 'Bonos', label: 'Bonos' },
                        { value: 'ETF', label: 'ETF' }
                      ]}
                      value={formData.tipoInstrumento || ''}
                      onChange={(value) => handleInputChange('tipoInstrumento', value)}
                      placeholder="Seleccione tipo..."
                    />
                    {errors.tipoInstrumento && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <Icons.AlertCircle className="w-4 h-4" />
                        {errors.tipoInstrumento}
                      </p>
                    )}
                  </div>

                  {/* Mercado de Origen */}
                  <div className="space-y-2">
                    <label htmlFor="mercadoOrigen" className="block text-sm font-medium text-gray-300">
                      Mercado de Origen <span className="text-orange-500">*</span>
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'Nacional', label: 'Nacional' },
                        { value: 'Extranjero', label: 'Extranjero' }
                      ]}
                      value={formData.mercadoOrigen || ''}
                      onChange={(value) => handleInputChange('mercadoOrigen', value)}
                      placeholder="Seleccione mercado..."
                    />
                    {errors.mercadoOrigen && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <Icons.AlertCircle className="w-4 h-4" />
                        {errors.mercadoOrigen}
                      </p>
                    )}
                  </div>

                  {/* Período */}
                  <div className="space-y-2">
                    <label htmlFor="periodo" className="block text-sm font-medium text-gray-300">
                      Período ({dateFormat}) <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="periodo"
                        value={periodoFormatted}
                        onChange={(e) => {
                          setPeriodoFormatted(e.target.value)
                          // Limpiar error si existe
                          if (errors.periodo) {
                            setErrors(prev => {
                              const new = { ...prev }
                              delete new.periodo
                              return new
                            })
                          }
                        }}
                        className={`w-full bg-white/5 border ${errors.periodo ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all`}
                        placeholder={dateFormat}
                      />
                      <Icons.Calendar className="absolute right-4 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    {errors.periodo && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <Icons.AlertCircle className="w-4 h-4" />
                        {errors.periodo}
                      </p>
                    )}
                  </div>

                  {/* RUT Contribuyente */}
                  <div className="space-y-2">
                    <label htmlFor="rutContribuyente" className="block text-sm font-medium text-gray-300">
                      RUT Contribuyente {isCreateMode && <span className="text-orange-500">*</span>}
                    </label>
                    <input
                      ref={firstInputRef}
                      type="text"
                      id="rutContribuyente"
                      value={rutContribuyenteFormatted}
                      onChange={(e) => {
                        const inputValue = e.target.value

                        // Formatear automáticamente mientras se escribe
                        // Usamos formatRUT directamente para dar feedback visual inmediato
                        const formatted = formatRUT(inputValue)
                        setRutContribuyenteFormatted(formatted)

                        // Validar el RUT formateado
                        const rutResult = validateAndFormatRUT(formatted)

                        if (rutResult.isValid) {
                          handleInputChange('rutContribuyente', rutResult.clean)
                          setErrors(prev => {
                            const newErrors = { ...prev }
                            delete newErrors.rutContribuyente
                            return newErrors
                          })
                        } else {
                          // Si no es válido aún (o está incompleto), guardamos undefined en el modelo
                          // pero mantenemos el valor formateado en el input visual
                          handleInputChange('rutContribuyente', undefined)

                          // Solo mostrar error si tiene una longitud considerable y sigue siendo inválido
                          // para no molestar mientras escribe
                          if (inputValue.length > 8 && !rutResult.isValid) {
                            setErrors(prev => ({
                              ...prev,
                              rutContribuyente: 'RUT inválido. Formato: 11.111.111-1'
                            }))
                          } else {
                            // Limpiar error mientras escribe si es corto
                            setErrors(prev => {
                              const newErrors = { ...prev }
                              delete newErrors.rutContribuyente
                              return newErrors
                            })
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value
                        if (inputValue) {
                          const rutResult = validateAndFormatRUT(inputValue)
                          if (!rutResult.isValid) {
                            setErrors(prev => ({
                              ...prev,
                              rutContribuyente: 'RUT inválido. Formato: 11.111.111-1'
                            }))
                          }
                        } else if (isCreateMode) {
                          setErrors(prev => ({
                            ...prev,
                            rutContribuyente: 'El RUT del contribuyente es obligatorio'
                          }))
                        }
                      }}
                      className={`w-full bg-white/5 border ${errors.rutContribuyente ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all`}
                      placeholder="12.345.678-9"
                    />
                    {errors.rutContribuyente && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <Icons.AlertCircle className="w-4 h-4" />
                        {errors.rutContribuyente}
                      </p>
                    )}
                  </div>
                </div>

                {/* Checkbox No Inscrita */}
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    id="esNoInscrita"
                    checked={formData.esNoInscrita || false}
                    onChange={(e) => handleInputChange('esNoInscrita', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 bg-gray-700"
                  />
                  <label htmlFor="esNoInscrita" className="text-sm font-medium text-gray-300 cursor-pointer">
                    Marcar como Acción No Inscrita (Artículo 107 LIR no aplica)
                  </label>
                </div>
              </div>

              {/* Sección 2: Montos y Valores */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                  <Icons.DollarSign className="w-5 h-5" />
                  Monto y Moneda
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="monto" className="block text-sm font-medium text-gray-300">
                      Monto <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="monto"
                      value={formData.monto?.valor || 0}
                      onChange={(e) => handleInputChange('monto', { ...formData.monto, valor: parseFloat(e.target.value) || 0 })}
                      className={`w-full bg-white/5 border ${errors.monto ? 'border-red-500' : 'border-white/10'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all`}
                      min="0"
                      step="0.01"
                    />
                    {errors.monto && (
                      <p className="text-sm text-red-400 flex items-center gap-1">
                        <Icons.AlertCircle className="w-4 h-4" />
                        {errors.monto}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="moneda" className="block text-sm font-medium text-gray-300">
                      Moneda
                    </label>
                    <CustomDropdown
                      options={[
                        { value: 'CLP', label: 'Peso Chileno (CLP)' },
                        { value: 'USD', label: 'Dólar (USD)' },
                        { value: 'UF', label: 'Unidad de Fomento (UF)' }
                      ]}
                      value={formData.monto?.moneda || 'CLP'}
                      onChange={(value) => handleInputChange('monto', { ...formData.monto, moneda: value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Factores Tributarios */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                    <Icons.Percent className="w-5 h-5" />
                    Factores Tributarios (F8-F19)
                  </h3>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${Math.abs(factorSum - 1) < 0.001 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    Suma: {(factorSum * 100).toFixed(1)}%
                  </div>
                </div>

                {errors.factores && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <Icons.AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{errors.factores}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Object.keys(factores).map((key) => (
                    <div key={key} className="space-y-1">
                      <label htmlFor={key} className="block text-xs font-medium text-gray-400 uppercase">
                        {key.replace('factor', 'Factor ')}
                      </label>
                      <input
                        type="number"
                        id={key}
                        value={factores[key as keyof TaxFactors]}
                        onChange={(e) => handleFactorChange(key as keyof TaxFactors, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all text-right"
                        min="0"
                        max="1"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Error General de Envío */}
              {errors.submit && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <Icons.AlertTriangle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{errors.submit}</p>
                </div>
              )}

            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 font-medium transition-all"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="qualification-form"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium hover:from-orange-700 hover:to-amber-700 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Icons.Refresh className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Icons.Save className="w-4 h-4" />
                  {isCreateMode ? 'Crear Calificación' : 'Guardar Cambios'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  )
}

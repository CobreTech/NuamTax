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
import { validateAndFormatRUT } from '../../utils/rutUtils'
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

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      if (isCreateMode) {
        // Modo creación
        if (!userProfile) {
          throw new Error('Usuario no autenticado')
        }

        // En modo creación, el RUT contribuyente es obligatorio y ya está validado
        if (!formData.rutContribuyente) {
          throw new Error('El RUT del contribuyente es obligatorio')
        }

        // Normalizar período a formato estándar (YYYY-MM-DD) para almacenamiento
        const parsedPeriodo = parseDate(periodoFormatted, dateFormat)
        if (!parsedPeriodo) {
          throw new Error('El período no es una fecha válida')
        }
        const periodoNormalized = normalizeDateForStorage(periodoFormatted, dateFormat)

        const newQualification: TaxQualification = {
          id: '', // Se generará en createQualification
          usuarioId: userProfile.uid,
          tipoInstrumento: formData.tipoInstrumento!,
          mercadoOrigen: formData.mercadoOrigen!,
          periodo: periodoNormalized, // Normalizado a YYYY-MM-DD
          tipoCalificacion: formData.tipoCalificacion,
          esNoInscrita: formData.esNoInscrita || false,
          factores,
          creditosConfig, // Incluir configuración de créditos
          monto: formData.monto || { valor: 0, moneda: 'CLP' },
          rutContribuyente: formData.rutContribuyente, // Obligatorio en modo creación
          fechaCreacion: new Date(),
          fechaUltimaModificacion: new Date(),
        }

        const qualificationId = await createQualification(newQualification)

        // Registrar log de auditoría
        if (userProfile) {
          await logQualificationCreated(
            userProfile.uid,
            userProfile.email || '',
            `${userProfile.Nombre} ${userProfile.Apellido}`,
            qualificationId,
            {
              tipoInstrumento: newQualification.tipoInstrumento,
              mercadoOrigen: newQualification.mercadoOrigen,
              periodo: newQualification.periodo,
            }
          )
        }
      } else {
        // Modo edición
        if (!qualification) return

        // Obtener datos antes de actualizar para el log de auditoría
        const beforeData = await getQualificationById(qualification.id)

        // Preparar datos para actualizar, asegurando que monto tenga la estructura correcta
        const updateData: Partial<TaxQualification> = {
          tipoInstrumento: formData.tipoInstrumento,
          mercadoOrigen: formData.mercadoOrigen,
          periodo: formData.periodo,
          tipoCalificacion: formData.tipoCalificacion,
          esNoInscrita: formData.esNoInscrita,
          factores,
          creditosConfig, // Incluir configuración de créditos
          monto: formData.monto || { valor: 0, moneda: 'CLP' },
          rutContribuyente: formData.rutContribuyente || undefined,
        };

        await updateQualification(qualification.id, updateData)

        // Obtener datos después de actualizar para el log de auditoría
        const afterData = await getQualificationById(qualification.id)

        // Registrar log de auditoría
        if (userProfile && beforeData && afterData) {
          await logQualificationUpdated(
            userProfile.uid,
            userProfile.email || '',
            `${userProfile.Nombre} ${userProfile.Apellido}`,
            qualification.id,
            {
              tipoInstrumento: beforeData.tipoInstrumento,
              mercadoOrigen: beforeData.mercadoOrigen,
              periodo: beforeData.periodo,
            },
            {
              tipoInstrumento: afterData.tipoInstrumento,
              mercadoOrigen: afterData.mercadoOrigen,
              periodo: afterData.periodo,
            }
          )
        }
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error guardando calificación:', error)
      setErrors({
        submit: isCreateMode
          ? 'Error al crear la calificación. Intente nuevamente.'
          : 'Error al guardar la calificación. Intente nuevamente.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null
  // Permitir que el modal se abra en modo creación aunque qualification sea null
  if (!isCreateMode && !qualification) return null

  const factorKeys: (keyof TaxFactors)[] = ['factor8', 'factor9', 'factor10', 'factor11', 'factor12', 'factor13',
    'factor14', 'factor15', 'factor16']

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qualification-modal-title"
      >
        <div
          ref={modalRef}
          className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 id="qualification-modal-title" className="text-2xl font-bold text-white">
              {isCreateMode ? 'Nueva Calificación Tributaria' : 'Editar Calificación Tributaria'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors text-white"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tipoInstrumento" className="block text-sm font-medium mb-2 text-gray-200">
                  Tipo de Instrumento *
                </label>
                <input
                  ref={firstInputRef}
                  id="tipoInstrumento"
                  type="text"
                  value={formData.tipoInstrumento || ''}
                  onChange={(e) => handleInputChange('tipoInstrumento', e.target.value)}
                  className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 text-white placeholder-gray-400 ${errors.tipoInstrumento ? 'border-red-500' : 'border-white/30'
                    }`}
                  aria-required="true"
                  aria-invalid={errors.tipoInstrumento ? 'true' : 'false'}
                  aria-describedby={errors.tipoInstrumento ? 'tipoInstrumento-error' : undefined}
                />
                {errors.tipoInstrumento && (
                  <p id="tipoInstrumento-error" className="text-red-400 text-xs mt-1" role="alert">
                    {errors.tipoInstrumento}
                  </p>
                )}
              </div>

              <div>
                <CustomDropdown
                  label="Mercado de Origen *"
                  value={formData.mercadoOrigen || ''}
                  onChange={(val) => handleInputChange('mercadoOrigen', val as string)}
                  options={[
                    { value: "", label: "Seleccionar..." },
                    { value: "Bolsa de Santiago", label: "Bolsa de Santiago" },
                    { value: "BVC", label: "BVC" },
                    { value: "COLCAP", label: "COLCAP" },
                  ]}
                />
                {errors.mercadoOrigen && <p className="text-red-400 text-xs mt-1">{errors.mercadoOrigen}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  RUT Contribuyente {isCreateMode && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={rutContribuyenteFormatted}
                  onChange={(e) => {
                    const inputValue = e.target.value
                    setRutContribuyenteFormatted(inputValue)

                    // Validar y formatear en tiempo real
                    if (inputValue.trim() === '') {
                      handleInputChange('rutContribuyente', undefined)
                      // En modo creación, mostrar error si está vacío
                      if (isCreateMode) {
                        setErrors(prev => ({
                          ...prev,
                          rutContribuyente: 'El RUT del contribuyente es obligatorio'
                        }))
                      } else {
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.rutContribuyente
                          return newErrors
                        })
                      }
                    } else {
                      const rutResult = validateAndFormatRUT(inputValue)
                      setRutContribuyenteFormatted(rutResult.formatted)

                      if (rutResult.isValid) {
                        handleInputChange('rutContribuyente', rutResult.clean)
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.rutContribuyente
                          return newErrors
                        })
                      } else {
                        setErrors(prev => ({
                          ...prev,
                          rutContribuyente: 'RUT inválido. Formato: 11.111.111-1 o 11111111-1'
                        }))
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value.trim()
                    if (inputValue) {
                      const rutResult = validateAndFormatRUT(inputValue)
                      if (rutResult.isValid) {
                        setRutContribuyenteFormatted(rutResult.formatted)
                        handleInputChange('rutContribuyente', rutResult.clean)
                      }
                    } else if (isCreateMode) {
                      // En modo creación, validar que no esté vacío al perder el foco
                      setErrors(prev => ({
                        ...prev,
                        rutContribuyente: 'El RUT del contribuyente es obligatorio'
                      }))
                    }
                  }}
                  className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.rutContribuyente ? 'border-red-500' : 'border-white/30'
                    }`}
                  placeholder={isCreateMode ? "Ej: 12.345.678-9 o 12345678-9 (obligatorio)" : "Ej: 12.345.678-9 o 12345678-9 (opcional)"}
                  required={isCreateMode}
                />
                {errors.rutContribuyente && (
                  <p className="text-red-400 text-xs mt-1">{errors.rutContribuyente}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {isCreateMode
                    ? 'Persona natural o jurídica dueña de esta calificación. Campo obligatorio.'
                    : 'Persona natural o jurídica dueña de esta calificación. Si no se especifica, se usará el RUT del corredor.'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Período *</label>
                <input
                  type="text"
                  value={periodoFormatted}
                  onChange={(e) => {
                    const inputValue = e.target.value
                    setPeriodoFormatted(inputValue)

                    // Validar y parsear en tiempo real
                    if (inputValue.trim() === '') {
                      setErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors.periodo
                        return newErrors
                      })
                    } else {
                      const parsedDate = parseDate(inputValue, dateFormat)
                      if (parsedDate) {
                        // Fecha válida, limpiar error
                        setErrors(prev => {
                          const newErrors = { ...prev }
                          delete newErrors.periodo
                          return newErrors
                        })
                      } else {
                        // Fecha inválida, mostrar error
                        setErrors(prev => ({
                          ...prev,
                          periodo: `Formato inválido. Use: ${dateFormat}`
                        }))
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value.trim()
                    if (inputValue) {
                      const parsedDate = parseDate(inputValue, dateFormat)
                      if (parsedDate) {
                        // Formatear correctamente según la configuración
                        setPeriodoFormatted(formatDate(parsedDate, dateFormat))
                      }
                    }
                  }}
                  placeholder={dateFormat}
                  className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.periodo ? 'border-red-500' : 'border-white/30'
                    }`}
                />
                {errors.periodo && <p className="text-red-400 text-xs mt-1">{errors.periodo}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Formato: {dateFormat}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Tipo de Calificación</label>
                <input
                  type="text"
                  value={formData.tipoCalificacion || ''}
                  onChange={(e) => handleInputChange('tipoCalificacion', e.target.value)}
                  className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.tipoCalificacion ? 'border-red-500' : 'border-white/30'
                    }`}
                />
                {errors.tipoCalificacion && <p className="text-red-400 text-xs mt-1">{errors.tipoCalificacion}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Monto (Valor) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monto?.valor || 0}
                  onChange={(e) => handleInputChange('monto', {
                    ...formData.monto,
                    valor: parseFloat(e.target.value) || 0,
                    moneda: formData.monto?.moneda || 'CLP'
                  })}
                  className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white ${errors.monto ? 'border-red-500' : 'border-white/30'
                    }`}
                />
                {errors.monto && <p className="text-red-400 text-xs mt-1">{errors.monto}</p>}
              </div>

              <div>
                <CustomDropdown
                  label="Moneda"
                  value={formData.monto?.moneda || 'CLP'}
                  onChange={(val) => handleInputChange('monto', {
                    ...formData.monto,
                    valor: formData.monto?.valor || 0,
                    moneda: val as string
                  })}
                  options={[
                    { value: "CLP", label: "CLP" },
                    { value: "USD", label: "USD" },
                    { value: "EUR", label: "EUR" },
                  ]}
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.esNoInscrita || false}
                    onChange={(e) => handleInputChange('esNoInscrita', e.target.checked)}
                    className="w-5 h-5 rounded bg-slate-800/50 border-white/30 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-200">Calificación No Inscrita</span>
                </label>
              </div>
            </div>

            {/* Factores tributarios */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-200">
                  Distribución de Factores (DJ1948) *
                  <span className="block text-xs text-gray-400 font-normal mt-1">
                    Ingrese el porcentaje (0-1) para cada columna oficial del SII.
                  </span>
                </label>
                <div className={`text-sm font-medium ${factorSum > 1 ? 'text-red-400' : 'text-green-400'}`}>
                  Suma: {(factorSum * 100).toFixed(2)}% {factorSum > 1 && '⚠️'}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(Object.keys(factores) as Array<keyof TaxFactors>).map((key) => {
                  const labels: Record<string, string> = {
                    factor8: "C8: Rentas Trib. Cumplida",
                    factor9: "C9: Rentas RAP (Ex 14TER)",
                    factor10: "C10: Otras rentas",
                    factor11: "C11: Exc. Dist. Desprop.",
                    factor12: "C12: Utilidades ISFUT",
                    factor13: "C13: Rentas < 1983",
                    factor14: "C14: Exentas IGC (L.18401)",
                    factor15: "C15: Otras Exentas IGC/IA",
                    factor16: "C16: Ingresos No Renta"
                  }

                  const descriptions: Record<string, string> = {
                    factor8: "Rentas con Tributación Cumplida (RAP, REX)",
                    factor9: "Rentas del registro RAP (Ex 14 TER)",
                    factor10: "Otras rentas percibidas sin prioridad",
                    factor11: "Exceso Distribuciones Desproporcionadas",
                    factor12: "Utilidades afectadas con ISFUT",
                    factor13: "Rentas generadas hasta 31.12.1983",
                    factor14: "Rentas exentas IGC (Ley 18.401)",
                    factor15: "Otras Rentas Exentas de IGC/IA",
                    factor16: "Ingresos No Constitutivos de Renta"
                  }

                  return (
                    <div key={key} className="group relative">
                      <label
                        className="block text-xs text-gray-300 mb-1 truncate cursor-help"
                        title={descriptions[key]}
                      >
                        {labels[key]}
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        value={factores[key]}
                        onChange={(e) => handleFactorChange(key, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-white"
                      />
                      {/* Tooltip personalizado on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {descriptions[key]}
                      </div>
                    </div>
                  )
                })}
              </div>
              {errors.factores && <p className="text-red-400 text-xs mt-2">{errors.factores}</p>}
            </div>

            {/* Configuración de Créditos Tributarios */}
            <div className="space-y-4 p-4 border border-orange-500/30 rounded-xl bg-orange-500/5">
              <div>
                <h3 className="text-sm font-medium text-gray-200 mb-3">
                  Configuración de Créditos Tributarios
                  <span className="block text-xs text-gray-400 font-normal mt-1">
                    Parámetros para el cálculo automático de créditos (DJ1948 columnas C17-C32)
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Régimen Tributario */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Régimen Tributario</label>
                  <select
                    value={creditosConfig.regimenTributario}
                    onChange={(e) => setCreditosConfig({ ...creditosConfig, regimenTributario: e.target.value as '14A' | '14D3' })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                  >
                    <option value="14A">Art. 14 A (Régimen General)</option>
                    <option value="14D3">Art. 14 D N°3 (Pro Pyme)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Régimen tributario aplicable a los dividendos</p>
                </div>

                {/* Tasa IDPC */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Tasa IDPC (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={creditosConfig.tasaIDPC * 100}
                    onChange={(e) => setCreditosConfig({ ...creditosConfig, tasaIDPC: parseFloat(e.target.value) / 100 || 0 })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Tasa del Impuesto de Primera Categoría (ej: 27% para 2025)</p>
                </div>

                {/* Año Tributario */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-200">Año Tributario</label>
                  <input
                    type="number"
                    min="2017"
                    max={new Date().getFullYear() + 1}
                    value={creditosConfig.anioTributario}
                    onChange={(e) => setCreditosConfig({ ...creditosConfig, anioTributario: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">Año al que corresponde la declaración</p>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3">
                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creditosConfig.creditoConDevolucion}
                      onChange={(e) => setCreditosConfig({ ...creditosConfig, creditoConDevolucion: e.target.checked })}
                      className="mt-1 w-5 h-5 rounded bg-slate-800/50 border-white/30 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-200">
                      <strong>Crédito con Derecho a Devolución</strong>
                      <span className="block text-xs text-gray-400 mt-0.5">Permite solicitar devolución del exceso de crédito</span>
                    </span>
                  </label>

                  <label className="flex items-start space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creditosConfig.creditoSujetoRestitucion}
                      onChange={(e) => setCreditosConfig({ ...creditosConfig, creditoSujetoRestitucion: e.target.checked })}
                      className="mt-1 w-5 h-5 rounded bg-slate-800/50 border-white/30 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-200">
                      <strong>Crédito Sujeto a Restitución</strong>
                      <span className="block text-xs text-gray-400 mt-0.5">Sujeto a restitución según Art. 56 N°3 y 63 LIR</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-800/50 border border-white/30 rounded-xl hover:bg-slate-700/50 transition-colors text-white"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || factorSum > 1}
                className="px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                {isSaving
                  ? (isCreateMode ? 'Creando...' : 'Guardando...')
                  : (isCreateMode ? 'Crear Calificación' : 'Guardar Cambios')
                }
              </button>
            </div>
          </div>
        </div>
      </div >
    </Portal >
  )
}

'use client'

/**
 * Componente EditQualificationModal
 * 
 * Modal para editar calificaciones tributarias existentes
 * Implementa RF-05: Ingreso y modificación manual
 * Implementa RF-03: Validación automática de factores
 */

import { useState, useEffect } from 'react'
import { TaxQualification, TaxFactors } from './types'
import { updateQualification, getQualificationById, createQualification } from '../../services/firestoreService'
import { validateFactorsSum } from '../../services/taxValidationService'
import { logQualificationUpdated, logQualificationCreated } from '../../services/auditService'
import { useAuth } from '../../context/AuthContext'
import { validateAndFormatRUT } from '../../utils/rutUtils'
import Icons from '../../utils/icons'
import CustomDropdown from '../../components/CustomDropdown'

// Alias para el icono X
const X = Icons.Close

interface EditQualificationModalProps {
  qualification: TaxQualification | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  mode?: 'create' | 'edit' // Nuevo: modo de operación
}

export default function EditQualificationModal({
  qualification,
  isOpen,
  onClose,
  onSave,
  mode = 'edit' // Por defecto es modo edición
}: EditQualificationModalProps) {
  const isCreateMode = mode === 'create'
  const { userProfile } = useAuth()
  const [formData, setFormData] = useState<Partial<TaxQualification>>({})
  const [factores, setFactores] = useState<TaxFactors>({
    factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
    factor14: 0, factor15: 0, factor16: 0, factor17: 0, factor18: 0, factor19: 0
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [factorSum, setFactorSum] = useState(0)
  const [rutContribuyenteFormatted, setRutContribuyenteFormatted] = useState('')

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (isCreateMode) {
        // Modo creación: inicializar con valores vacíos
        setFormData({
          tipoInstrumento: '',
          mercadoOrigen: '',
          periodo: '',
          tipoCalificacion: '',
          monto: { valor: 0, moneda: 'CLP' },
          esNoInscrita: false,
          rutContribuyente: undefined
        })
        setRutContribuyenteFormatted('')
        setFactores({
          factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
          factor14: 0, factor15: 0, factor16: 0, factor17: 0, factor18: 0, factor19: 0
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
        // Formatear RUT contribuyente si existe
        if (qualification.rutContribuyente) {
          const rutResult = validateAndFormatRUT(qualification.rutContribuyente)
          setRutContribuyenteFormatted(rutResult.formatted)
        } else {
          setRutContribuyenteFormatted('')
        }
        setFactores(qualification.factores || {
          factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0, factor13: 0,
          factor14: 0, factor15: 0, factor16: 0, factor17: 0, factor18: 0, factor19: 0
        })
        setErrors({})
      }
    }
  }, [qualification, isOpen, isCreateMode])

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
    if (!formData.periodo || formData.periodo.trim() === '') {
      newErrors.periodo = 'El período es requerido'
    }
    if (!formData.monto || formData.monto.valor === undefined || formData.monto.valor === null || formData.monto.valor < 0) {
      newErrors.monto = 'El monto debe ser un número válido mayor o igual a 0'
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

        const newQualification: TaxQualification = {
          id: '', // Se generará en createQualification
          usuarioId: userProfile.uid,
          tipoInstrumento: formData.tipoInstrumento!,
          mercadoOrigen: formData.mercadoOrigen!,
          periodo: formData.periodo!,
          tipoCalificacion: formData.tipoCalificacion,
          esNoInscrita: formData.esNoInscrita || false,
          factores,
          monto: formData.monto || { valor: 0, moneda: 'CLP' },
          rutContribuyente: formData.rutContribuyente || undefined,
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
  if (!isCreateMode && !qualification) return null

  const factorKeys: (keyof TaxFactors)[] = ['factor8', 'factor9', 'factor10', 'factor11', 'factor12', 'factor13',
    'factor14', 'factor15', 'factor16', 'factor17', 'factor18', 'factor19']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-2xl p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isCreateMode ? 'Nueva Calificación Tributaria' : 'Editar Calificación Tributaria'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">Tipo de Instrumento *</label>
              <input
                type="text"
                value={formData.tipoInstrumento || ''}
                onChange={(e) => handleInputChange('tipoInstrumento', e.target.value)}
                className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.tipoInstrumento ? 'border-red-500' : 'border-white/30'
                  }`}
              />
              {errors.tipoInstrumento && <p className="text-red-400 text-xs mt-1">{errors.tipoInstrumento}</p>}
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
              <label className="block text-sm font-medium mb-2 text-gray-200">RUT Contribuyente</label>
              <input
                type="text"
                value={rutContribuyenteFormatted}
                onChange={(e) => {
                  const inputValue = e.target.value
                  setRutContribuyenteFormatted(inputValue)

                  // Validar y formatear en tiempo real
                  if (inputValue.trim() === '') {
                    handleInputChange('rutContribuyente', undefined)
                    setErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors.rutContribuyente
                      return newErrors
                    })
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
                  }
                }}
                className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.rutContribuyente ? 'border-red-500' : 'border-white/30'
                  }`}
                placeholder="Ej: 12.345.678-9 o 12345678-9 (opcional)"
              />
              {errors.rutContribuyente && (
                <p className="text-red-400 text-xs mt-1">{errors.rutContribuyente}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Persona natural o jurídica dueña de esta calificación. Si no se especifica, se usará el RUT del corredor.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-200">Período *</label>
              <input
                type="text"
                value={formData.periodo || ''}
                onChange={(e) => handleInputChange('periodo', e.target.value)}
                placeholder="2024-12-31"
                className={`w-full px-4 py-2 bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400 ${errors.periodo ? 'border-red-500' : 'border-white/30'
                  }`}
              />
              {errors.periodo && <p className="text-red-400 text-xs mt-1">{errors.periodo}</p>}
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
              <label className="block text-sm font-medium text-gray-200">Factores Tributarios (F8-F19) *</label>
              <div className={`text-sm font-medium ${factorSum > 1 ? 'text-red-400' : 'text-green-400'}`}>
                Suma: {(factorSum * 100).toFixed(2)}% {factorSum > 1 && '⚠️'}
              </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {factorKeys.map((key) => (
                <div key={key}>
                  <label className="block text-xs text-gray-300 mb-1">{key.toUpperCase().replace('FACTOR', 'F')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="1"
                    value={factores[key]}
                    onChange={(e) => handleFactorChange(key, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm text-white"
                  />
                </div>
              ))}
            </div>
            {errors.factores && <p className="text-red-400 text-xs mt-2">{errors.factores}</p>}
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
    </div>
  )
}


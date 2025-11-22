'use client'

/**
 * Componente SettingsSection
 * 
 * Sección de configuración de usuario que permite personalizar el comportamiento
 * de la aplicación. Incluye formato de fecha, separador decimal, tamaño de página,
 * notificaciones y guardado automático. La configuración se persiste en Firestore
 * y se carga automáticamente al iniciar sesión.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { saveUserConfig, getUserConfig } from '../../services/firestoreService'
import Icons from '../../utils/icons'
import CustomDropdown from '../../components/CustomDropdown'

interface SettingsSectionProps {
  dateFormat: string
  setDateFormat: (format: string) => void
  decimalSeparator: string
  setDecimalSeparator: (separator: string) => void
  pageSize: number
  setPageSize: (size: number) => void
}

export default function SettingsSection({
  dateFormat,
  setDateFormat,
  decimalSeparator,
  setDecimalSeparator,
  pageSize,
  setPageSize
}: SettingsSectionProps) {
  const { userProfile } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Cargar configuración adicional (notificaciones, autoSave) al montar
  useEffect(() => {
    if (!userProfile?.uid) return

    const loadAdditionalConfig = async () => {
      try {
        const config = await getUserConfig(userProfile.uid)
        if (config) {
          setNotifications(config.notifications)
          setAutoSave(config.autoSave)
        }
      } catch (error) {
        console.error('Error cargando configuración adicional:', error)
      }
    }

    loadAdditionalConfig()
  }, [userProfile?.uid])

  // Función para guardar configuración con debounce
  const saveConfig = useCallback(async () => {
    if (!userProfile?.uid) return

    setSaving(true)
    setSaveStatus('saving')

    try {
      await saveUserConfig(userProfile.uid, {
        dateFormat,
        decimalSeparator: decimalSeparator as 'coma' | 'punto',
        pageSize,
        notifications,
        autoSave
      })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Error guardando configuración:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }, [userProfile?.uid, dateFormat, decimalSeparator, pageSize, notifications, autoSave])

  // Auto-guardar cuando cambian los valores (con debounce)
  useEffect(() => {
    if (!userProfile?.uid || !autoSave) return

    const timeoutId = setTimeout(() => {
      saveConfig()
    }, 1000) // Debounce de 1 segundo

    return () => clearTimeout(timeoutId)
  }, [dateFormat, decimalSeparator, pageSize, notifications, autoSave, saveConfig, userProfile?.uid])

  // Handler para guardar manualmente
  const handleManualSave = async () => {
    await saveConfig()
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-bold">Configuración del Sistema</h2>
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Icons.Refresh className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Icons.Success className="w-4 h-4" />
                <span>Guardado</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <Icons.Error className="w-4 h-4" />
                <span>Error al guardar</span>
              </div>
            )}
            <button
              onClick={handleManualSave}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
            >
              <Icons.Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Formato de Fecha */}
          <div>
            <CustomDropdown
              label="Formato de Fecha"
              value={dateFormat}
              onChange={(val) => setDateFormat(val as string)}
              options={[
                { value: 'DD/MM/AAAA', label: 'DD/MM/AAAA' },
                { value: 'AAAA-MM-DD', label: 'AAAA-MM-DD' },
                { value: 'MM/DD/AAAA', label: 'MM/DD/AAAA' }
              ]}
            />
            <p className="text-xs text-gray-400 mt-1">Formato actual: {dateFormat}</p>
          </div>

          {/* Separador Decimal */}
          <div>
            <CustomDropdown
              label="Separador Decimal"
              value={decimalSeparator}
              onChange={(val) => setDecimalSeparator(val as string)}
              options={[
                { value: 'coma', label: 'Coma (,)' },
                { value: 'punto', label: 'Punto (.)' }
              ]}
            />
            <p className="text-xs text-gray-400 mt-1">
              Ejemplo: {decimalSeparator === 'coma' ? '1.234,56' : '1,234.56'}
            </p>
          </div>

          {/* Tamaño de Página */}
          <div>
            <CustomDropdown
              label="Tamaño de Página (Tablas)"
              value={pageSize}
              onChange={(val) => setPageSize(val as number)}
              options={[
                { value: 10, label: '10 registros' },
                { value: 25, label: '25 registros' },
                { value: 50, label: '50 registros' },
                { value: 100, label: '100 registros' }
              ]}
            />
            <p className="text-xs text-gray-400 mt-1">
              Se mostrarán {pageSize} registros por página en las tablas
            </p>
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs lg:text-sm font-medium">Notificaciones</h4>
              <p className="text-xs text-gray-400">Recibir alertas sobre actualizaciones</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          {/* Guardado Automático */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs lg:text-sm font-medium">Guardado Automático</h4>
              <p className="text-xs text-gray-400">Guardar cambios automáticamente</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

        </div>
      </div>
    </div>
  )
}

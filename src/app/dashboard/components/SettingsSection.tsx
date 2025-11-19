'use client'

/**
 * Componente SettingsSection (Sección de Configuración)
 * 
 * Permite a los usuarios personalizar el comportamiento de la aplicación
 */

import { useState } from 'react'
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
  const [notifications, setNotifications] = useState(true)
  const [autoSave, setAutoSave] = useState(true)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
        <h2 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6">Configuración del Sistema</h2>

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

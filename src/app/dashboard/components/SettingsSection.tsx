'use client'

/**
 * Componente SettingsSection (Sección de Configuración)
 * 
 * Permite a los usuarios personalizar el comportamiento de la aplicación
 */

import { useState } from 'react'
import Icons from '../../utils/icons'

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
            <label htmlFor="date-format" className="block text-xs lg:text-sm font-medium mb-2">
              Formato de Fecha
            </label>
            <select
              id="date-format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full sm:w-auto px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
            >
              <option value="DD/MM/AAAA">DD/MM/AAAA</option>
              <option value="AAAA-MM-DD">AAAA-MM-DD</option>
              <option value="MM/DD/AAAA">MM/DD/AAAA</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Formato actual: {dateFormat}</p>
          </div>

          {/* Separador Decimal */}
          <div>
            <label htmlFor="decimal-separator" className="block text-xs lg:text-sm font-medium mb-2">
              Separador Decimal
            </label>
            <select
              id="decimal-separator"
              value={decimalSeparator}
              onChange={(e) => setDecimalSeparator(e.target.value)}
              className="w-full sm:w-auto px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
            >
              <option value="coma">Coma (,)</option>
              <option value="punto">Punto (.)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Ejemplo: {decimalSeparator === 'coma' ? '1.234,56' : '1,234.56'}
            </p>
          </div>

          {/* Tamaño de Página */}
          <div>
            <label htmlFor="page-size" className="block text-xs lg:text-sm font-medium mb-2">
              Tamaño de Página (Tablas)
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full sm:w-auto px-3 lg:px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm lg:text-base"
            >
              <option value={10}>10 registros</option>
              <option value={25}>25 registros</option>
              <option value={50}>50 registros</option>
              <option value={100}>100 registros</option>
            </select>
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

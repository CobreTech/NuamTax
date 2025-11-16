/**
 * @file exportService.ts
 * @description Servicio para exportar calificaciones a CSV y Excel
 * Implementa funcionalidad de exportación de datos
 */

import { TaxQualification } from '../dashboard/components/types'
import * as XLSX from 'xlsx'

/**
 * Exporta calificaciones a formato CSV
 */
export function exportToCSV(qualifications: TaxQualification[], filename: string = 'calificaciones'): void {
  // Preparar datos para CSV según documentación
  const headers = [
    'Tipo de Instrumento',
    'Mercado de Origen',
    'Período',
    'Tipo de Calificación',
    'Monto Valor',
    'Moneda',
    'Factor8', 'Factor9', 'Factor10', 'Factor11', 'Factor12', 'Factor13',
    'Factor14', 'Factor15', 'Factor16', 'Factor17', 'Factor18', 'Factor19',
    'Suma Factores',
    'Es No Inscrita',
    'Fecha Creación',
    'Última Actualización'
  ]

  const rows = qualifications.map(qual => {
    const factorSum = Object.values(qual.factores).reduce((acc, val) => acc + val, 0)
    return [
      qual.tipoInstrumento,
      qual.mercadoOrigen,
      qual.periodo,
      qual.tipoCalificacion || '',
      qual.monto.valor,
      qual.monto.moneda,
      qual.factores.factor8,
      qual.factores.factor9,
      qual.factores.factor10,
      qual.factores.factor11,
      qual.factores.factor12,
      qual.factores.factor13,
      qual.factores.factor14,
      qual.factores.factor15,
      qual.factores.factor16,
      qual.factores.factor17,
      qual.factores.factor18,
      qual.factores.factor19,
      factorSum.toFixed(4),
      qual.esNoInscrita ? 'Sí' : 'No',
      qual.fechaCreacion.toLocaleDateString('es-CL'),
      qual.fechaUltimaModificacion.toLocaleDateString('es-CL')
    ]
  })

  // Crear contenido CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Crear blob y descargar
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Exporta calificaciones a formato Excel (XLSX)
 */
export function exportToExcel(qualifications: TaxQualification[], filename: string = 'calificaciones'): void {
  // Preparar datos para Excel según documentación
  const data = qualifications.map(qual => {
    const factorSum = Object.values(qual.factores).reduce((acc, val) => acc + val, 0)
    return {
      'Tipo de Instrumento': qual.tipoInstrumento,
      'Mercado de Origen': qual.mercadoOrigen,
      'Período': qual.periodo,
      'Tipo de Calificación': qual.tipoCalificacion || '',
      'Monto Valor': qual.monto.valor,
      'Moneda': qual.monto.moneda,
      'Factor8': qual.factores.factor8,
      'Factor9': qual.factores.factor9,
      'Factor10': qual.factores.factor10,
      'Factor11': qual.factores.factor11,
      'Factor12': qual.factores.factor12,
      'Factor13': qual.factores.factor13,
      'Factor14': qual.factores.factor14,
      'Factor15': qual.factores.factor15,
      'Factor16': qual.factores.factor16,
      'Factor17': qual.factores.factor17,
      'Factor18': qual.factores.factor18,
      'Factor19': qual.factores.factor19,
      'Suma Factores': factorSum,
      'Es No Inscrita': qual.esNoInscrita ? 'Sí' : 'No',
      'Fecha Creación': qual.fechaCreacion.toLocaleDateString('es-CL'),
      'Última Actualización': qual.fechaUltimaModificacion.toLocaleDateString('es-CL')
    }
  })

  // Crear workbook y worksheet
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Calificaciones')

  // Ajustar ancho de columnas
  const columnWidths = [
    { wch: 20 }, // Tipo de Instrumento
    { wch: 15 }, // Mercado de Origen
    { wch: 12 }, // Período
    { wch: 20 }, // Tipo de Calificación
    { wch: 12 }, // Monto Valor
    { wch: 8 },  // Moneda
    ...Array(12).fill({ wch: 8 }), // Factores Factor8-Factor19
    { wch: 12 }, // Suma
    { wch: 12 }, // Es No Inscrita
    { wch: 15 }, // Fecha Creación
    { wch: 18 }  // Última Actualización
  ]
  worksheet['!cols'] = columnWidths

  // Descargar archivo
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}


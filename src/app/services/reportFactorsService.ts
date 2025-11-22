/**
 * @file reportFactorsService.ts
 * @description Servicio para generar reporte de Factores por Instrumento
 * Analiza la distribución de factores F8-F19 por tipo de instrumento
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Agrupa calificaciones por tipo de instrumento
 */
function groupByInstrument(qualifications: TaxQualification[]): Map<string, TaxQualification[]> {
  const grouped = new Map<string, TaxQualification[]>()
  
  qualifications.forEach(qual => {
    const instrument = qual.tipoInstrumento || 'Sin especificar'
    if (!grouped.has(instrument)) {
      grouped.set(instrument, [])
    }
    grouped.get(instrument)!.push(qual)
  })
  
  return grouped
}

/**
 * Calcula estadísticas de factores por instrumento
 */
function calculateFactorStats(qualifications: TaxQualification[]) {
  const total = qualifications.length
  
  // Inicializar acumuladores para cada factor (F8-F19)
  const factorTotals: Record<string, number> = {}
  const factorCounts: Record<string, number> = {}
  
  // Inicializar contadores de factores tributarios
  for (let i = 8; i <= 19; i++) {
    factorTotals[`factor${i}`] = 0
    factorCounts[`factor${i}`] = 0
  }
  
  // Calcular totales y promedios por factor
  qualifications.forEach(q => {
    const factors = q.factores || {}
    Object.keys(factors).forEach(factorKey => {
      const value = factors[factorKey as keyof typeof factors] || 0
      if (value > 0) {
        factorTotals[factorKey] = (factorTotals[factorKey] || 0) + value
        factorCounts[factorKey] = (factorCounts[factorKey] || 0) + 1
      }
    })
  })
  
  // Calcular promedios
  const factorAverages: Record<string, number> = {}
  Object.keys(factorTotals).forEach(factorKey => {
    const count = factorCounts[factorKey] || 0
    factorAverages[factorKey] = count > 0 ? factorTotals[factorKey] / count : 0
  })
  
  // Calcular suma total de factores
  const totalFactorSum = qualifications.reduce((sum, q) => {
    const factors = q.factores || {}
    return sum + Object.values(factors).reduce((fSum, f) => fSum + (f || 0), 0)
  }, 0)
  const avgFactorSum = total > 0 ? totalFactorSum / total : 0
  
  // Calcular distribución porcentual de factores
  const factorDistribution: Record<string, number> = {}
  Object.keys(factorTotals).forEach(factorKey => {
    if (totalFactorSum > 0) {
      factorDistribution[factorKey] = (factorTotals[factorKey] / totalFactorSum) * 100
    } else {
      factorDistribution[factorKey] = 0
    }
  })
  
  return {
    total,
    factorTotals,
    factorAverages,
    factorDistribution,
    avgFactorSum,
    totalFactorSum
  }
}

/**
 * Obtiene el nombre legible de un factor
 */
function getFactorName(factorKey: string): string {
  const factorNum = factorKey.replace('factor', '')
  return `F${factorNum}`
}

/**
 * Genera el reporte PDF de Factores por Instrumento
 */
export function generateFactorsReportPDF(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  filters?: {
    dateFrom?: string
    dateTo?: string
  }
): void {
  // Filtrar calificaciones si hay filtros
  let filteredQuals = qualifications
  
  if (filters?.dateFrom || filters?.dateTo) {
    filteredQuals = qualifications.filter(q => {
      const fechaMod = q.fechaUltimaModificacion
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom)
        if (fechaMod < fromDate) return false
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (fechaMod > toDate) return false
      }
      return true
    })
  }
  
  // Agrupar por instrumento
  const grouped = groupByInstrument(filteredQuals)
  
  // Ordenar instrumentos alfabéticamente
  const sortedInstruments = Array.from(grouped.keys()).sort()
  
  // Crear PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Encabezado
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Análisis de Factores por Instrumento', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado por: ${userProfile.Nombre} ${userProfile.Apellido}`, 20, 30)
  doc.text(`RUT: ${userProfile.Rut || 'N/A'}`, 20, 35)
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CL')}`, 20, 40)
  doc.text(`Total de calificaciones: ${filteredQuals.length}`, 20, 45)
  
  let yPos = 55
  
  // Resumen general de factores
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen General de Factores', 20, yPos)
  yPos += 10
  
  const generalStats = calculateFactorStats(filteredQuals)
  
  // Tabla de resumen general
  const summaryData: string[][] = []
  for (let i = 8; i <= 19; i++) {
    const factorKey = `factor${i}`
    const total = generalStats.factorTotals[factorKey] || 0
    const avg = generalStats.factorAverages[factorKey] || 0
    const distribution = generalStats.factorDistribution[factorKey] || 0
    
    summaryData.push([
      getFactorName(factorKey),
      `${(total * 100).toFixed(2)}%`,
      `${(avg * 100).toFixed(2)}%`,
      `${distribution.toFixed(2)}%`
    ])
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['Factor', 'Total Acumulado', 'Promedio', 'Distribución %']],
    body: summaryData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: 'bold', textColor: 255 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 20, right: 20 }
  })
  
  yPos = (doc as any).lastAutoTable?.finalY || yPos + 50
  yPos += 10
  
  // Detalle por instrumento
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Análisis por Tipo de Instrumento', 20, yPos)
  yPos += 10
  
  sortedInstruments.forEach(instrument => {
    // Verificar si hay espacio en la página
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    const quals = grouped.get(instrument) || []
    const stats = calculateFactorStats(quals)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(instrument, 20, yPos)
    yPos += 8
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total de calificaciones: ${stats.total}`, 20, yPos)
    yPos += 5
    doc.text(`Suma promedio de factores: ${(stats.avgFactorSum * 100).toFixed(2)}%`, 20, yPos)
    yPos += 8
    
    // Tabla de factores para este instrumento
    const instrumentData: string[][] = []
    for (let i = 8; i <= 19; i++) {
      const factorKey = `factor${i}`
      const total = stats.factorTotals[factorKey] || 0
      const avg = stats.factorAverages[factorKey] || 0
      const distribution = stats.factorDistribution[factorKey] || 0
      
      instrumentData.push([
        getFactorName(factorKey),
        `${(total * 100).toFixed(2)}%`,
        `${(avg * 100).toFixed(2)}%`,
        `${distribution.toFixed(2)}%`
      ])
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Factor', 'Total', 'Promedio', 'Distribución %']],
      body: instrumentData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [70, 130, 180], fontSize: 7, fontStyle: 'bold', textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 20, right: 20 }
    })
    
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 50
    yPos += 10
  })
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' })
  }
  
  // Descargar PDF
  const filename = `Reporte_Factores_Instrumento_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}


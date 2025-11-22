/**
 * @file reportPeriodService.ts
 * @description Servicio para generar reporte de Resumen por Período
 * Agrupa y consolida calificaciones por período fiscal
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Agrupa calificaciones por período
 */
function groupByPeriod(qualifications: TaxQualification[]): Map<string, TaxQualification[]> {
  const grouped = new Map<string, TaxQualification[]>()
  
  qualifications.forEach(qual => {
    const periodo = qual.periodo || 'Sin período'
    if (!grouped.has(periodo)) {
      grouped.set(periodo, [])
    }
    grouped.get(periodo)!.push(qual)
  })
  
  return grouped
}

/**
 * Calcula estadísticas por período
 */
function calculatePeriodStats(qualifications: TaxQualification[]) {
  const total = qualifications.length
  const totalAmount = qualifications.reduce((sum, q) => sum + (q.monto?.valor || 0), 0)
  const avgAmount = total > 0 ? totalAmount / total : 0
  
  // Calcular suma de factores
  const factorSum = qualifications.reduce((sum, q) => {
    const factors = q.factores || {}
    return sum + Object.values(factors).reduce((fSum, f) => fSum + (f || 0), 0)
  }, 0)
  const avgFactorSum = total > 0 ? factorSum / total : 0
  
  // Contar por tipo de instrumento
  const instrumentCounts = new Map<string, number>()
  qualifications.forEach(q => {
    const instrument = q.tipoInstrumento || 'N/A'
    instrumentCounts.set(instrument, (instrumentCounts.get(instrument) || 0) + 1)
  })
  
  // Contar por mercado
  const marketCounts = new Map<string, number>()
  qualifications.forEach(q => {
    const market = q.mercadoOrigen || 'N/A'
    marketCounts.set(market, (marketCounts.get(market) || 0) + 1)
  })
  
  return {
    total,
    totalAmount,
    avgAmount,
    avgFactorSum,
    instrumentCounts,
    marketCounts
  }
}

/**
 * Genera el reporte PDF de Resumen por Período
 */
export function generatePeriodReportPDF(
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
  
  // Agrupar por período
  const grouped = groupByPeriod(filteredQuals)
  
  // Ordenar períodos (más recientes primero)
  const sortedPeriods = Array.from(grouped.keys()).sort((a, b) => {
    // Intentar ordenar por año y trimestre si el formato es "YYYY-QX"
    const aMatch = a.match(/(\d{4})-Q(\d)/)
    const bMatch = b.match(/(\d{4})-Q(\d)/)
    
    if (aMatch && bMatch) {
      const aYear = parseInt(aMatch[1])
      const bYear = parseInt(bMatch[1])
      if (aYear !== bYear) return bYear - aYear
      return parseInt(bMatch[2]) - parseInt(aMatch[2])
    }
    
    // Orden alfabético inverso como fallback
    return b.localeCompare(a)
  })
  
  // Crear PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Encabezado
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen de Calificaciones por Período', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado por: ${userProfile.Nombre} ${userProfile.Apellido}`, 20, 30)
  doc.text(`RUT: ${userProfile.Rut || 'N/A'}`, 20, 35)
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CL')}`, 20, 40)
  doc.text(`Total de calificaciones: ${filteredQuals.length}`, 20, 45)
  
  let yPos = 55
  
  // Resumen consolidado
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen Consolidado', 20, yPos)
  yPos += 10
  
  const summaryData: string[][] = []
  let totalAll = 0
  let totalAmountAll = 0
  
  sortedPeriods.forEach(periodo => {
    const quals = grouped.get(periodo) || []
    const stats = calculatePeriodStats(quals)
    totalAll += stats.total
    totalAmountAll += stats.totalAmount
    
    summaryData.push([
      periodo,
      stats.total.toString(),
      `$${stats.totalAmount.toLocaleString('es-CL')}`,
      `$${Math.round(stats.avgAmount).toLocaleString('es-CL')}`,
      `${(stats.avgFactorSum * 100).toFixed(2)}%`
    ])
  })
  
  // Agregar totales
  summaryData.push([
    'TOTAL',
    totalAll.toString(),
    `$${totalAmountAll.toLocaleString('es-CL')}`,
    `$${Math.round(totalAmountAll / (totalAll || 1)).toLocaleString('es-CL')}`,
    '-'
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Período', 'Cantidad', 'Monto Total', 'Monto Promedio', 'Factor Promedio']],
    body: summaryData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], fontSize: 9, fontStyle: 'bold', textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 20, right: 20 }
  })
  
  yPos = (doc as any).lastAutoTable?.finalY || yPos + 50
  yPos += 10
  
  // Detalle por período
  sortedPeriods.forEach(periodo => {
    // Verificar si hay espacio en la página
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    const quals = grouped.get(periodo) || []
    const stats = calculatePeriodStats(quals)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Período: ${periodo}`, 20, yPos)
    yPos += 8
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total de calificaciones: ${stats.total}`, 20, yPos)
    yPos += 5
    doc.text(`Monto total: $${stats.totalAmount.toLocaleString('es-CL')}`, 20, yPos)
    yPos += 5
    doc.text(`Monto promedio: $${Math.round(stats.avgAmount).toLocaleString('es-CL')}`, 20, yPos)
    yPos += 5
    doc.text(`Factor promedio: ${(stats.avgFactorSum * 100).toFixed(2)}%`, 20, yPos)
    yPos += 8
    
    // Distribución por instrumento
    if (stats.instrumentCounts.size > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Distribución por Instrumento:', 20, yPos)
      yPos += 6
      
      const instrumentData: string[][] = Array.from(stats.instrumentCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([instrument, count]) => [
          instrument,
          count.toString(),
          `${((count / stats.total) * 100).toFixed(1)}%`
        ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Instrumento', 'Cantidad', 'Porcentaje']],
        body: instrumentData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: 'bold', textColor: 255 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 20, right: 20 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 } }
      })
      
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 30
      yPos += 8
    }
    
    // Distribución por mercado
    if (stats.marketCounts.size > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Distribución por Mercado:', 20, yPos)
      yPos += 6
      
      const marketData: string[][] = Array.from(stats.marketCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([market, count]) => [
          market,
          count.toString(),
          `${((count / stats.total) * 100).toFixed(1)}%`
        ])
      
      autoTable(doc, {
        startY: yPos,
        head: [['Mercado', 'Cantidad', 'Porcentaje']],
        body: marketData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: 'bold', textColor: 255 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 20, right: 20 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 } }
      })
      
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 30
      yPos += 10
    }
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
  const filename = `Resumen_Por_Periodo_${userProfile.Rut?.replace(/[^0-9K]/g, '') || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}


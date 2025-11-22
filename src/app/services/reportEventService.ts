/**
 * @file reportEventService.ts
 * @description Servicio para generar reporte de Calificaciones por Evento de Capital
 * Agrupa y analiza calificaciones por tipo de evento de capital
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Tipos de eventos de capital
 */
type CapitalEvent = 'dividend' | 'split' | 'merger' | 'other'

/**
 * Agrupa calificaciones por evento de capital
 */
function groupByEvent(qualifications: TaxQualification[]): Map<string, TaxQualification[]> {
  const grouped = new Map<string, TaxQualification[]>()
  
  qualifications.forEach(qual => {
    // Determinar el tipo de evento basado en tipoCalificacion
    let eventType: string = 'other'
    
    if (qual.tipoCalificacion) {
      const tipoLower = qual.tipoCalificacion.toLowerCase()
      if (tipoLower.includes('dividendo') || tipoLower.includes('dividend')) {
        eventType = 'dividend'
      } else if (tipoLower.includes('split') || tipoLower.includes('división')) {
        eventType = 'split'
      } else if (tipoLower.includes('fusión') || tipoLower.includes('merger')) {
        eventType = 'merger'
      }
    }
    
    if (!grouped.has(eventType)) {
      grouped.set(eventType, [])
    }
    grouped.get(eventType)!.push(qual)
  })
  
  return grouped
}

/**
 * Calcula estadísticas por evento
 */
function calculateEventStats(qualifications: TaxQualification[]) {
  const total = qualifications.length
  const totalAmount = qualifications.reduce((sum, q) => sum + (q.monto?.valor || 0), 0)
  const avgAmount = total > 0 ? totalAmount / total : 0
  
  // Calcular suma de factores
  const factorSum = qualifications.reduce((sum, q) => {
    const factors = q.factores || {}
    return sum + Object.values(factors).reduce((fSum, f) => fSum + (f || 0), 0)
  }, 0)
  const avgFactorSum = total > 0 ? factorSum / total : 0
  
  return {
    total,
    totalAmount,
    avgAmount,
    avgFactorSum
  }
}

/**
 * Obtiene el nombre legible del evento
 */
function getEventName(eventType: string): string {
  const names: Record<string, string> = {
    'dividend': 'Dividendos',
    'split': 'División de Acciones',
    'merger': 'Fusión',
    'other': 'Otros Eventos'
  }
  return names[eventType] || 'Otros Eventos'
}

/**
 * Genera el reporte PDF de Calificaciones por Evento de Capital
 */
export function generateEventReportPDF(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  filters?: {
    eventFilter?: string
    dateFrom?: string
    dateTo?: string
  }
): void {
  // Filtrar calificaciones si hay filtros
  let filteredQuals = qualifications
  
  if (filters?.eventFilter) {
    const eventType = filters.eventFilter.toLowerCase()
    filteredQuals = qualifications.filter(q => {
      if (!q.tipoCalificacion) return eventType === 'other'
      const tipoLower = q.tipoCalificacion.toLowerCase()
      if (eventType === 'dividend') {
        return tipoLower.includes('dividendo') || tipoLower.includes('dividend')
      } else if (eventType === 'split') {
        return tipoLower.includes('split') || tipoLower.includes('división')
      } else if (eventType === 'merger') {
        return tipoLower.includes('fusión') || tipoLower.includes('merger')
      }
      return true
    })
  }
  
  if (filters?.dateFrom || filters?.dateTo) {
    filteredQuals = filteredQuals.filter(q => {
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
  
  // Agrupar por evento
  const grouped = groupByEvent(filteredQuals)
  
  // Crear PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })
  
  // Encabezado
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Reporte de Calificaciones por Evento de Capital', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado por: ${userProfile.Nombre} ${userProfile.Apellido}`, 20, 30)
  doc.text(`RUT: ${userProfile.Rut || 'N/A'}`, 20, 35)
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CL')}`, 20, 40)
  doc.text(`Total de calificaciones: ${filteredQuals.length}`, 20, 45)
  
  let yPos = 55
  
  // Resumen por evento
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen por Tipo de Evento', 20, yPos)
  yPos += 10
  
  const summaryData: string[][] = []
  let totalAll = 0
  let totalAmountAll = 0
  
  Array.from(grouped.entries()).forEach(([eventType, quals]) => {
    const stats = calculateEventStats(quals)
    totalAll += stats.total
    totalAmountAll += stats.totalAmount
    
    summaryData.push([
      getEventName(eventType),
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
    head: [['Tipo de Evento', 'Cantidad', 'Monto Total', 'Monto Promedio', 'Factor Promedio']],
    body: summaryData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185], fontSize: 9, fontStyle: 'bold', textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 20, right: 20 }
  })
  
  yPos = (doc as any).lastAutoTable?.finalY || yPos + 50
  yPos += 10
  
  // Detalle por evento
  Array.from(grouped.entries()).forEach(([eventType, quals]) => {
    // Verificar si hay espacio en la página
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(getEventName(eventType), 20, yPos)
    yPos += 8
    
    const stats = calculateEventStats(quals)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total de calificaciones: ${stats.total}`, 20, yPos)
    yPos += 5
    doc.text(`Monto total: $${stats.totalAmount.toLocaleString('es-CL')}`, 20, yPos)
    yPos += 5
    doc.text(`Monto promedio: $${Math.round(stats.avgAmount).toLocaleString('es-CL')}`, 20, yPos)
    yPos += 8
    
    // Tabla de detalle
    const detailData: string[][] = quals.slice(0, 20).map(q => [
      q.tipoInstrumento || 'N/A',
      q.mercadoOrigen || 'N/A',
      q.periodo || 'N/A',
      `$${(q.monto?.valor || 0).toLocaleString('es-CL')}`,
      `${Object.values(q.factores || {}).reduce((sum, f) => sum + (f || 0), 0) * 100}%`
    ])
    
    if (quals.length > 20) {
      detailData.push(['...', `y ${quals.length - 20} más`, '', '', ''])
    }
    
    autoTable(doc, {
      startY: yPos,
      head: [['Instrumento', 'Mercado', 'Período', 'Monto', 'Suma Factores']],
      body: detailData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 73, 94], fontSize: 8, fontStyle: 'bold', textColor: 255 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
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
  const filename = `Reporte_Eventos_Capital_${userProfile.Rut?.replace(/[^0-9K]/g, '') || 'N/A'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}


/**
 * @file dj1948Service.ts
 * @description Servicio para generar reporte DJ1948 en múltiples formatos
 * PDF, CSV y Excel según instructivo del SII
 * IMPORTANTE: El DJ1948 se genera por CONTRIBUYENTE, no por corredor
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import { DJ1948Data, DJ1948Totales } from './dj1948Types'
import { transformToDJ1948Data, calculateDJ1948Totales } from './dj1948TransformService'
import { validateAndFormatRUT } from '../utils/rutUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

/**
 * Agrupa calificaciones por contribuyente (rutContribuyente)
 * Retorna un mapa: RUT Contribuyente -> Calificaciones[]
 */
function groupByContribuyente(qualifications: TaxQualification[]): Map<string, TaxQualification[]> {
  const grouped = new Map<string, TaxQualification[]>();

  qualifications.forEach(qual => {
    // Usar rutContribuyente si existe, sino usar usuarioId como fallback
    // Normalizar RUTs para agrupar correctamente (sin puntos ni guiones)
    let rutContribuyente = qual.rutContribuyente || qual.usuarioId;

    // Limpiar y normalizar el RUT para agrupar
    if (rutContribuyente) {
      const rutResult = validateAndFormatRUT(rutContribuyente)
      rutContribuyente = rutResult.clean || rutContribuyente.toUpperCase()
    }

    if (!grouped.has(rutContribuyente)) {
      grouped.set(rutContribuyente, []);
    }
    grouped.get(rutContribuyente)!.push(qual);
  });

  return grouped;
}

/**
 * Obtiene la lista única de contribuyentes de las calificaciones
 */
export function getContribuyentesFromQualifications(qualifications: TaxQualification[]): Array<{ rut: string; count: number; rutClean?: string }> {
  const grouped = groupByContribuyente(qualifications);
  return Array.from(grouped.entries()).map(([rutClean, quals]) => {
    // Formatear RUT para mostrar, pero mantener limpio para comparaciones
    const rutFormatted = validateAndFormatRUT(rutClean).formatted || rutClean;
    return {
      rut: rutFormatted, // Formateado para mostrar
      rutClean: rutClean, // Limpio para comparaciones
      count: quals.length
    };
  });
}

/**
 * Genera el reporte DJ1948 en formato PDF para un contribuyente específico
 */
export function generateDJ1948PDF(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  anioTributario: string,
  rutContribuyente?: string, // RUT del contribuyente para el cual generar el reporte
  additionalData?: {
    domicilio?: string;
    comuna?: string;
    telefono?: string;
    rutReceptor?: string;
    cantidadAcciones?: number;
    tipoPropietario?: 1 | 2;
    nombreContribuyente?: string; // Nombre del contribuyente (si es diferente al corredor)
  }
): void {
  // Filtrar calificaciones por contribuyente si se especifica
  let calificacionesFiltradas = qualifications;
  if (rutContribuyente) {
    // Normalizar RUT para comparación
    const rutContribuyenteClean = validateAndFormatRUT(rutContribuyente).clean || rutContribuyente.toUpperCase();

    calificacionesFiltradas = qualifications.filter(q => {
      const qRutClean = q.rutContribuyente
        ? (validateAndFormatRUT(q.rutContribuyente).clean || q.rutContribuyente.toUpperCase())
        : q.usuarioId;
      return qRutClean === rutContribuyenteClean;
    });
  }

  // Si no hay calificaciones, usar todas (comportamiento anterior)
  if (calificacionesFiltradas.length === 0) {
    calificacionesFiltradas = qualifications;
  }

  // Determinar RUT del declarante: usar rutContribuyente si existe, sino el del corredor
  const rutDeclaranteRaw = rutContribuyente || userProfile.Rut || '';
  const rutDeclarante = rutDeclaranteRaw ? validateAndFormatRUT(rutDeclaranteRaw).clean : '';
  const nombreDeclarante = additionalData?.nombreContribuyente ||
    (rutContribuyente && rutContribuyente !== userProfile.Rut ? rutContribuyente : `${userProfile.Nombre} ${userProfile.Apellido}`.trim());

  // Crear un perfil temporal para el contribuyente si es diferente al corredor
  const rutContribuyenteClean = rutContribuyente ? validateAndFormatRUT(rutContribuyente).clean : '';
  const userRutClean = userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).clean : '';

  const declaranteProfile: UserProfile = rutContribuyenteClean && rutContribuyenteClean !== userRutClean
    ? {
      ...userProfile,
      Rut: validateAndFormatRUT(rutContribuyenteClean).formatted || rutContribuyenteClean,
      Nombre: additionalData?.nombreContribuyente?.split(' ')[0] || userProfile.Nombre,
      Apellido: additionalData?.nombreContribuyente?.split(' ').slice(1).join(' ') || userProfile.Apellido,
    }
    : {
      ...userProfile,
      Rut: userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).formatted || userProfile.Rut : '',
    };

  const data = transformToDJ1948Data(calificacionesFiltradas, declaranteProfile, anioTributario, additionalData);
  const totales = calculateDJ1948Totales(data);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Configuración de fuente
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Encabezado del formulario
  doc.setFontSize(7);
  doc.text('Declaración Jurada anual sobre retiros, remesas y/o dividendos distribuidos, o cantidades distribuidas a cualquier título y créditos correspondientes, efectuados por contribuyentes sujetos al régimen de la letra A) y al número 3 de la letra D) del artículo 14 de la LIR, y sobre saldo de retiros en exceso pendientes de imputación.', 14, 10, { maxWidth: 270, align: 'left' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('F 1948', 280, 10, { align: 'right' });

  let yPos = 20;

  // SECCIÓN A: IDENTIFICACIÓN DEL DECLARANTE
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Sección A: IDENTIFICACIÓN DEL DECLARANTE', 14, yPos);
  doc.setFontSize(7);
  doc.text('FOLIO', 280, yPos, { align: 'right' });
  yPos += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('ROL ÚNICO TRIBUTARIO', 14, yPos);
  doc.text(data.declarante.rut || '', 60, yPos);
  doc.text('NOMBRE O RAZÓN SOCIAL', 100, yPos);
  doc.text(data.declarante.nombreRazonSocial || '', 160, yPos);
  yPos += 4;

  doc.text('DOMICILIO', 14, yPos);
  doc.text(data.declarante.domicilioPostal || '', 60, yPos);
  doc.text('COMUNA', 100, yPos);
  doc.text(data.declarante.comuna || '', 160, yPos);
  yPos += 4;

  doc.text('CORREO ELECTRÓNICO', 14, yPos);
  doc.text(data.declarante.correoElectronico || '', 60, yPos);
  doc.text('TELÉFONO', 100, yPos);
  doc.text(data.declarante.telefono || '', 160, yPos);
  yPos += 8;

  // SECCIÓN B: ANTECEDENTES DE LOS INFORMADOS
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Sección B: ANTECEDENTES DE LOS INFORMADOS (Receptor de los retiros, remesas o dividendos. Persona natural o jurídica)', 14, yPos);
  yPos += 5;

  // Preparar datos para la tabla con todas las columnas principales
  const tableData = data.informados.map(row => [
    row.c1 || '',  // C1: Fecha
    row.c2 || '',  // C2: RUT
    row.c3 === 1 ? '1' : row.c3 === 2 ? '2' : '',  // C3: Tipo
    row.c4.toString(),  // C4: Acciones
    row.c5.toLocaleString('es-CL'),  // C5
    row.c6.toLocaleString('es-CL'),  // C6
    row.c7.toLocaleString('es-CL'),  // C7
    row.c8.toLocaleString('es-CL'),  // C8
    row.c9.toLocaleString('es-CL'),  // C9
    row.c10.toLocaleString('es-CL'),  // C10
    row.c11.toLocaleString('es-CL'),  // C11
    row.c12.toLocaleString('es-CL'),  // C12
    row.c13.toLocaleString('es-CL'),  // C13
    row.c14.toLocaleString('es-CL'),  // C14
    row.c15.toLocaleString('es-CL'),  // C15
    row.c16.toLocaleString('es-CL'),  // C16
    row.c17.toLocaleString('es-CL'),  // C17
    row.c18.toLocaleString('es-CL'),  // C18
    row.c19.toLocaleString('es-CL'),  // C19
    row.c20.toLocaleString('es-CL'),  // C20
    row.c21.toLocaleString('es-CL'),  // C21
    row.c22.toLocaleString('es-CL'),  // C22
    row.c23.toLocaleString('es-CL'),  // C23
    row.c24.toLocaleString('es-CL'),  // C24
    row.c25.toLocaleString('es-CL'),  // C25
    row.c26.toLocaleString('es-CL'),  // C26
    row.c27.toLocaleString('es-CL'),  // C27
    row.c28.toLocaleString('es-CL'),  // C28
    row.c29.toLocaleString('es-CL'),  // C29
    row.c30.toLocaleString('es-CL'),  // C30
    row.c31.toLocaleString('es-CL'),  // C31
    row.c32.toLocaleString('es-CL'),  // C32
    row.c33 || '',  // C33: Certificado
  ]);

  // Headers de la tabla
  const headers = [
    ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22', 'C23', 'C24', 'C25', 'C26', 'C27', 'C28', 'C29', 'C30', 'C31', 'C32', 'C33']
  ];

  autoTable(doc, {
    startY: yPos,
    head: headers,
    body: tableData,
    styles: {
      fontSize: 5,
      cellPadding: 0.5,
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: {
      fillColor: [200, 200, 200],
      fontSize: 5,
      fontStyle: 'bold',
      textColor: [0, 0, 0]
    },
    bodyStyles: {
      fontSize: 5,
      textColor: [0, 0, 0]
    },
    margin: { left: 14, right: 14 },
    pageBreak: 'auto',
    tableWidth: 'wrap',
    columnStyles: {
      0: { cellWidth: 20 }, // C1: Fecha
      1: { cellWidth: 25 }, // C2: RUT
      2: { cellWidth: 8 },  // C3: Tipo
      3: { cellWidth: 12 }, // C4: Acciones
      4: { cellWidth: 15 }, // C5-C33: Montos
    }
  });

  // Obtener última posición después de la tabla
  const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;

  // SECCIÓN C: RETIROS EN EXCESO (si hay)
  if (data.retirosExceso.length > 0) {
    doc.addPage();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Sección C: ANTECEDENTES DE RETIROS EN EXCESO (Detalle de saldos pendientes de imputación)', 14, 20);

    const excesoData = data.retirosExceso.map(ret => [
      ret.c34 || '',
      ret.c35.toLocaleString('es-CL')
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['C34: RUT Beneficiario', 'C35: Monto Reajustado']],
      body: excesoData,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [200, 200, 200], fontSize: 7, fontStyle: 'bold' },
    });
  }

  // CUADRO RESUMEN FINAL
  doc.addPage();
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CUADRO RESUMEN FINAL DE LA DECLARACION', 14, 20);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  let summaryY = 30;
  const summaryData = [
    ['C5: IDPC 2017+', totales.c5.toLocaleString('es-CL')],
    ['C6: IDPC hasta 2016', totales.c6.toLocaleString('es-CL')],
    ['C7: IDPC Voluntario', totales.c7.toLocaleString('es-CL')],
    ['C8: Sin crédito', totales.c8.toLocaleString('es-CL')],
    ['C9: RAP', totales.c9.toLocaleString('es-CL')],
    ['C10: Otras rentas', totales.c10.toLocaleString('es-CL')],
    ['C11: Exceso distribuciones', totales.c11.toLocaleString('es-CL')],
    ['C12: ISFUT 20.780', totales.c12.toLocaleString('es-CL')],
    ['C13: Rentas hasta 1983', totales.c13.toLocaleString('es-CL')],
    ['C14: Exentas IGC 18.401', totales.c14.toLocaleString('es-CL')],
    ['C15: Exentos IGC/IA', totales.c15.toLocaleString('es-CL')],
    ['C16: No constitutivos', totales.c16.toLocaleString('es-CL')],
    ['Total registros', data.informados.length.toString()],
  ];

  autoTable(doc, {
    startY: summaryY,
    head: [['Concepto', 'Total']],
    body: summaryData,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [200, 200, 200], fontSize: 7, fontStyle: 'bold' },
  });

  // Declaración jurada al final
  const lastPageY = (doc as any).lastAutoTable?.finalY || summaryY + 50;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DECLARO BAJO JURAMENTO QUE LOS DATOS CONTENIDOS EN EL PRESENTE DOCUMENTO SON LA EXPRESION FIEL DE LA VERDAD, POR LO QUE ASUMO LA RESPONSABILIDAD CORRESPONDIENTE', 14, lastPageY + 10, { maxWidth: 270, align: 'left' });

  // Descargar PDF
  const filename = `DJ1948_${rutDeclarante}_${anioTributario}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Genera el reporte DJ1948 en formato CSV
 */
export function generateDJ1948CSV(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  anioTributario: string,
  rutContribuyente?: string,
  additionalData?: {
    domicilio?: string;
    comuna?: string;
    telefono?: string;
    rutReceptor?: string;
    cantidadAcciones?: number;
    tipoPropietario?: 1 | 2;
    nombreContribuyente?: string;
  }
): void {
  // Filtrar por contribuyente si se especifica
  let calificacionesFiltradas = qualifications;
  if (rutContribuyente) {
    calificacionesFiltradas = qualifications.filter(q =>
      q.rutContribuyente === rutContribuyente || (!q.rutContribuyente && q.usuarioId === rutContribuyente)
    );
  }
  if (calificacionesFiltradas.length === 0) {
    calificacionesFiltradas = qualifications;
  }

  const rutDeclaranteRaw = rutContribuyente || userProfile.Rut || '';
  const rutDeclarante = rutDeclaranteRaw ? validateAndFormatRUT(rutDeclaranteRaw).clean : '';
  const rutContribuyenteClean = rutContribuyente ? validateAndFormatRUT(rutContribuyente).clean : '';
  const userRutClean = userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).clean : '';

  const declaranteProfile: UserProfile = rutContribuyenteClean && rutContribuyenteClean !== userRutClean
    ? {
      ...userProfile,
      Rut: validateAndFormatRUT(rutContribuyenteClean).formatted || rutContribuyenteClean,
      Nombre: additionalData?.nombreContribuyente?.split(' ')[0] || userProfile.Nombre,
      Apellido: additionalData?.nombreContribuyente?.split(' ').slice(1).join(' ') || userProfile.Apellido,
    }
    : {
      ...userProfile,
      Rut: userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).formatted || userProfile.Rut : '',
    };

  const data = transformToDJ1948Data(calificacionesFiltradas, declaranteProfile, anioTributario, additionalData);

  // Usar template service para generar CSV con formato exacto SII
  const { generateFromTemplate } = require('./dj1948TemplateService');
  const csvContent = generateFromTemplate(data);

  // Descargar CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `DJ1948_${rutDeclarante}_${anioTributario}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Genera el reporte DJ1948 en formato Excel
 */
export function generateDJ1948Excel(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  anioTributario: string,
  rutContribuyente?: string,
  additionalData?: {
    domicilio?: string;
    comuna?: string;
    telefono?: string;
    rutReceptor?: string;
    cantidadAcciones?: number;
    tipoPropietario?: 1 | 2;
    nombreContribuyente?: string;
  }
): void {
  // Filtrar por contribuyente si se especifica
  let calificacionesFiltradas = qualifications;
  if (rutContribuyente) {
    calificacionesFiltradas = qualifications.filter(q =>
      q.rutContribuyente === rutContribuyente || (!q.rutContribuyente && q.usuarioId === rutContribuyente)
    );
  }
  if (calificacionesFiltradas.length === 0) {
    calificacionesFiltradas = qualifications;
  }

  const rutDeclaranteRaw = rutContribuyente || userProfile.Rut || '';
  const rutDeclarante = rutDeclaranteRaw ? validateAndFormatRUT(rutDeclaranteRaw).clean : '';
  const rutContribuyenteClean = rutContribuyente ? validateAndFormatRUT(rutContribuyente).clean : '';
  const userRutClean = userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).clean : '';

  const declaranteProfile: UserProfile = rutContribuyenteClean && rutContribuyenteClean !== userRutClean
    ? {
      ...userProfile,
      Rut: validateAndFormatRUT(rutContribuyenteClean).formatted || rutContribuyenteClean,
      Nombre: additionalData?.nombreContribuyente?.split(' ')[0] || userProfile.Nombre,
      Apellido: additionalData?.nombreContribuyente?.split(' ').slice(1).join(' ') || userProfile.Apellido,
    }
    : {
      ...userProfile,
      Rut: userProfile.Rut ? validateAndFormatRUT(userProfile.Rut).formatted || userProfile.Rut : '',
    };

  const data = transformToDJ1948Data(calificacionesFiltradas, declaranteProfile, anioTributario, additionalData);
  const totales = calculateDJ1948Totales(data);

  const workbook = XLSX.utils.book_new();

  // Hoja 1: Encabezado y Sección A - Declarante
  const declaranteData = [
    ['DECLARACIÓN JURADA 1948'],
    [`Año Tributario: ${anioTributario}`],
    [`Fecha de Generación: ${new Date().toLocaleDateString('es-CL')}`],
    [''],
    ['SECCIÓN A: IDENTIFICACIÓN DEL DECLARANTE'],
    [''],
    ['Campo', 'Valor'],
    ['RUT', data.declarante.rut],
    ['Nombre o Razón Social', data.declarante.nombreRazonSocial],
    ['Domicilio Postal', data.declarante.domicilioPostal],
    ['Comuna', data.declarante.comuna],
    ['Correo Electrónico', data.declarante.correoElectronico],
    ['Teléfono', data.declarante.telefono],
  ];
  const wsDeclarante = XLSX.utils.aoa_to_sheet(declaranteData);
  XLSX.utils.book_append_sheet(workbook, wsDeclarante, 'Sección A');

  // Hoja 2: Sección B - Informados
  const informadosData = data.informados.map(row => ({
    'C1: Fecha del retiro, remesa y/o dividendo distribuido': row.c1 || '',
    'C2: RUT del pleno propietario o usufructuario receptor': row.c2 || '',
    'C3: Usufructuario o Nudo Propietario (1=Usufructuario, 2=Nudo Propietario)': row.c3 === 1 ? '1' : row.c3 === 2 ? '2' : '',
    'C4: Cantidad de acciones al 31/12': row.c4,
    'C5: Con créditos por IDPC generados a contar del 01.01.2017': row.c5,
    'C6: Con créditos por IDPC acumulados hasta el 31.12.2016': row.c6,
    'C7: Con derecho a crédito por pago de IDPC voluntario': row.c7,
    'C8: Sin derecho a crédito': row.c8,
    'C9: Rentas provenientes del registro RAP y diferencia inicial': row.c9,
    'C10: Otras rentas percibidas sin prioridad en su orden de imputación': row.c10,
    'C11: Exceso distribuciones desproporcionadas': row.c11,
    'C12: Utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°20.780': row.c12,
    'C13: Rentas generadas hasta el 31.12.1983 y/o utilidades afectadas con ISFUT/ISIF': row.c13,
    'C14: Rentas exentas de IGC (artículo 11, Ley 18.401), afectas a impuesto adicional': row.c14,
    'C15: Exentos de IGC y/o IA': row.c15,
    'C16: Ingresos No constitutivos de renta': row.c16,
    'C17: Crédito sin derecho a devolución (2017-2019)': row.c17,
    'C18: Crédito con derecho a devolución (2017-2019)': row.c18,
    'C19: Crédito sin derecho a devolución (2020+)': row.c19,
    'C20: Crédito con derecho a devolución (2020+)': row.c20,
    'C21: Sujetos a restitución - Sin derecho a devolución': row.c21,
    'C22: Sujetos a restitución - Con derecho a devolución': row.c22,
    'C23: Asociados a Rentas Exentas - Sin derecho a devolución': row.c23,
    'C24: Asociados a Rentas Exentas - Con derecho a devolución': row.c24,
    'C25: Crédito por IPE': row.c25,
    'C26: Acumulados hasta 31.12.2016 - Asociados a Rentas Afectas - Sin derecho a devolución': row.c26,
    'C27: Acumulados hasta 31.12.2016 - Asociados a Rentas Afectas - Con derecho a devolución': row.c27,
    'C28: Acumulados hasta 31.12.2016 - Asociados a Rentas Exentas - Sin derecho a devolución': row.c28,
    'C29: Acumulados hasta 31.12.2016 - Asociados a Rentas Exentas - Con derecho a devolución': row.c29,
    'C30: Crédito por IPE (hasta 31.12.2016)': row.c30,
    'C31: Crédito por impuesto tasa adicional, ex. Art. 21 de la LIR': row.c31,
    'C32: Devolución de capital Art.17 N° 7 LIR': row.c32,
    'C33: Número de certificado': row.c33 || '',
  }));

  const wsInformados = XLSX.utils.json_to_sheet(informadosData);

  // Agregar fila de totales al final
  const totalesRow = {
    'C1: Fecha del retiro, remesa y/o dividendo distribuido': 'TOTALES',
    'C2: RUT del pleno propietario o usufructuario receptor': '',
    'C3: Usufructuario o Nudo Propietario (1=Usufructuario, 2=Nudo Propietario)': '',
    'C4: Cantidad de acciones al 31/12': totales.c4,
    'C5: Con créditos por IDPC generados a contar del 01.01.2017': totales.c5,
    'C6: Con créditos por IDPC acumulados hasta el 31.12.2016': totales.c6,
    'C7: Con derecho a crédito por pago de IDPC voluntario': totales.c7,
    'C8: Sin derecho a crédito': totales.c8,
    'C9: Rentas provenientes del registro RAP y diferencia inicial': totales.c9,
    'C10: Otras rentas percibidas sin prioridad en su orden de imputación': totales.c10,
    'C11: Exceso distribuciones desproporcionadas': totales.c11,
    'C12: Utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°20.780': totales.c12,
    'C13: Rentas generadas hasta el 31.12.1983 y/o utilidades afectadas con ISFUT/ISIF': totales.c13,
    'C14: Rentas exentas de IGC (artículo 11, Ley 18.401), afectas a impuesto adicional': totales.c14,
    'C15: Exentos de IGC y/o IA': totales.c15,
    'C16: Ingresos No constitutivos de renta': totales.c16,
    'C17: Crédito sin derecho a devolución (2017-2019)': totales.c17,
    'C18: Crédito con derecho a devolución (2017-2019)': totales.c18,
    'C19: Crédito sin derecho a devolución (2020+)': totales.c19,
    'C20: Crédito con derecho a devolución (2020+)': totales.c20,
    'C21: Sujetos a restitución - Sin derecho a devolución': totales.c21,
    'C22: Sujetos a restitución - Con derecho a devolución': totales.c22,
    'C23: Asociados a Rentas Exentas - Sin derecho a devolución': totales.c23,
    'C24: Asociados a Rentas Exentas - Con derecho a devolución': totales.c24,
    'C25: Crédito por IPE': totales.c25,
    'C26: Acumulados hasta 31.12.2016 - Asociados a Rentas Afectas - Sin derecho a devolución': totales.c26,
    'C27: Acumulados hasta 31.12.2016 - Asociados a Rentas Afectas - Con derecho a devolución': totales.c27,
    'C28: Acumulados hasta 31.12.2016 - Asociados a Rentas Exentas - Sin derecho a devolución': totales.c28,
    'C29: Acumulados hasta 31.12.2016 - Asociados a Rentas Exentas - Con derecho a devolución': totales.c29,
    'C30: Crédito por IPE (hasta 31.12.2016)': totales.c30,
    'C31: Crédito por impuesto tasa adicional, ex. Art. 21 de la LIR': totales.c31,
    'C32: Devolución de capital Art.17 N° 7 LIR': totales.c32,
    'C33: Número de certificado': '',
  };

  XLSX.utils.sheet_add_json(wsInformados, [totalesRow], { origin: -1, skipHeader: true });
  XLSX.utils.book_append_sheet(workbook, wsInformados, 'Sección B');

  // Hoja 3: Sección C - Retiros en Exceso (si hay)
  if (data.retirosExceso.length > 0) {
    const excesoData = data.retirosExceso.map(ret => ({
      'C34: RUT del beneficiario del retiro (titular, cesionario o usufructuario)': ret.c34,
      'C35: Montos de retiros en exceso reajustados ($)': ret.c35,
    }));
    const wsExceso = XLSX.utils.json_to_sheet(excesoData);
    XLSX.utils.book_append_sheet(workbook, wsExceso, 'Sección C');
  }

  // Hoja 4: Cuadro Resumen Final
  const resumenData = [
    ['CUADRO RESUMEN FINAL DE LA DECLARACIÓN'],
    [''],
    ['Columna', 'Total'],
    ...Object.entries(totales)
      .filter(([_, value]) => value !== 0 || _ === 'c4')
      .map(([key, value]) => [key, value]),
    ['Total de casos Informados', data.informados.length],
    [''],
    ['DECLARO BAJO JURAMENTO QUE LOS DATOS CONTENIDOS EN EL PRESENTE DOCUMENTO SON LA EXPRESION FIEL DE LA VERDAD, POR LO QUE ASUMO LA RESPONSABILIDAD CORRESPONDIENTE'],
  ];
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen Final');

  // Descargar Excel
  const filename = `DJ1948_${rutDeclarante}_${anioTributario}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

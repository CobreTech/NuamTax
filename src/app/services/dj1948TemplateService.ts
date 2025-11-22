/**
 * @file dj1948TemplateService.ts
 * @description Servicio para generar DJ1948 usando el template oficial del SII
 */

import { DJ1948Data, DJ1948Row } from './dj1948Types';

/**
 * Lee el template oficial y lo convierte en array de líneas
 */
export function loadTemplate(): string[] {
    // Template oficial con estructura base
    const template = `;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Declaración Jurada anual sobre retiros, remesas y/o dividendos distribuidos,  o cantidades distribuidas a cualquier título  y créditos correspondientes, efectuados por contribuyentes sujetos al régimen de la letra A) y al número 3 de la letra D) del artículo 14 de la LIR,  y sobre saldo de retiros en exceso pendientes de imputación.;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F1948;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Sección A: IDENTIFICACIÓN DEL DECLARANTE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;FOLIO;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
ROL ÚNICO TRIBUTARIO;;APELLIDO PATERNO O RAZÓN SOCIAL;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
APELLIDO MATERNO;;NOMBRES;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
CORREO ELECTRÓNICO ;;PERIODO;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Sección B: ;ANTECEDENTES DE LOS INFORMADOS (Receptor de los retiros, remesas o dividendos. Persona natural o jurídica);;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Fecha del retiro, remesa y/o dividendo distribuido;RUT del Pleno Propietario  o Usufructuario  receptor del retiro, remesa y/o dividendo distribuido;Usfructuario beneficiario del retiro, remesa y/o dividendo distribuido;Cantidad de acciones al 31/12;MONTOS DE RETIROS, REMESAS O DIVIDENDOS REAJUSTADOS ($);;;;;;;;;;;;CRÉDITOS PARA IMPUESTO GLOBAL COMPLEMENTARIO O ADICIONAL;;;;;;;;;;;;;;;Devolución de capital Art.17 N° 7 LIR.;Número de Certificado;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;Afectos a los Impuestos Global Complementario y/o Impuesto Adicional;;;;Rentas Exentas e Ingresos No Constitutivos de Renta (REX);;;;;;;;Acumulados a Contar del 01.01.2017;;;;;;;;;Acumulados Hasta el 31.12.2016;;;;;Crédito por impuesto tasa adicional, Ex. Art. 21  LIR.;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;Rentas Con Tributación Cumplida;;;;;Rentas Exentas ;;Ingresos No Constitutivos de  Renta;Asociados a Rentas Afectas;;;;;;Asociados a Rentas Exentas;;Crédito por IPE ;Asociados a Rentas Afectas;;Asociados a Rentas Exentas (artículo 11, Ley 18.401);;Crédito por IPE ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;Rentas provenientes del registro RAP y Diferencia Inicial de sociedad acogida al ex Art. 14 TER A) LIR;Otras rentas percibidas Sin Prioridad en su orden de imputación;"Exceso Distribuciones Desproporcionadas 
(N°9 Art.14 A)";Utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°20.780;Rentas generadas hasta el 31.12.1983 y/o utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°21.210 y/o con impuesto sustitutivo de impuestos finales (ISIF) Ley N° 21.681;Rentas Exentas de Impuesto Global Complementario (IGC) (Artículo 11, Ley 18.401), Afectas a Impuesto Adicional;Rentas Exentas de Impuesto Global Complementario (IGC) y/o Impuesto Adicional (IA);;No Sujetos a Restitución generados Hasta el 31.12.2019;;No Sujetos a Restitución generados a contar del 01.01.2020;;Sujetos a Restitución;;Sujetos a Restitución;;;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;Con crédito por IDPC generados a contar del 01.01.2017;Con crédito por IDPC acumulados  hasta el 31.12.2016;Con  derecho a crédito por pago de IDPC voluntario;Sin derecho a crédito;;;;;;;;;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
C1;C2;C3;C4;C5;C6;C7;C8;C9;C10;C11;C12;C13;C14;C15;C16;C17;C18;C19;C20;C21;C22;C23;C24;C25;C26;C27;C28;C29;C30;C31;C32;C33;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Sección C: ;ANTECEDENTES DE RETIROS EN EXCESO (Detalle de saldos pendientes de imputación);;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
RUT del beneficiario del retiro (titular o cesionario);"Montos de retiros en exceso, reajustados ($)
";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
C34;C35;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
CUADRO RESUMEN FINAL DE LA DECLARACION;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Cantidad de acciones al 31/12;MONTOS DE RETIROS, REMESAS O DIVIDENDOS REAJUSTADOS ($);;;;;;;;;;;;CRÉDITOS PARA IMPUESTO GLOBAL COMPLEMENTARIO O ADICIONAL;;;;;;;;;;;;;;;Devolución de capital Art.17 N° 7 LIR.;"Montos de retiros en exceso, reajustados ($)
";Total de casos Informados ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;Afectos a los Impuestos Global Complementario y/o Impuesto Adicional;;;;Rentas Exentas e Ingresos No Contitutivos de Renta (REX);;;;;;;;Acumulados a Contar del 01.01.2017;;;;;;;;;Acumulados Hasta el 31.12.2016;;;;;Crédito por impuesto tasa adicional, Ex. Art. 21  LIR.;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;Rentas Con Tributación Cumplida;;;;;Exentos de impuesto global complementario (IGC) y/o impuesto adicional (IA);;Ingresos No Constitutivos de  Renta;Asociados a Rentas Afectas;;;;;;Asociados a Rentas Exentas;;Crédito por IPE ;Asociados a Rentas Afectas;;Asociados a Rentas Exentas (artículo 11, Ley 18.401);;Crédito por IPE ;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;Rentas provenientes del registro RAP y Diferencia Inicial de sociedad acogida al ex Art. 14 TER A) LIR;Otras rentas percibidas Sin Prioridad en su orden de imputación;"Exceso Distribuciones Desproporcionadas 
(N°9 Art.14 A)";Utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°20.780;Rentas generadas hasta el 31.12.1983 y/o utilidades afectadas con impuesto sustitutivo al FUT (ISFUT) Ley N°21.210 y/o con impuesto sustitutivo de impuestos finales (ISIF) Ley N° 21.681;Rentas Exentas de Impuesto Global Complementario (IGC) (Artículo 11, Ley 18.401), Afectas a Impuesto Adicional;Rentas Exentas de Impuesto Global Complementario (IGC) y/o Impuesto Adicional (IA);;No Sujetos a Restitución generados Hasta el 31.12.2019;;No Sujetos a Restitución generados a contar del 01.01.2020;;Sujetos a Restitución;;Sujetos a Restitución;;;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;Con crédito por IDPC generados a contar del 01.01.2017;Con crédito por IDPC acumulados  hasta el 31.12.2016;Con  derecho a crédito por pago de IDPC voluntario;Sin derecho a crédito;;;;;;;;;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;Sin derecho a devolución;Con derecho a devolución;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
C36;C37;C38;C39;C40;C41;C42;C43;C44;C45;C46;C47;C48;C49;C50;C51;C52;C53;C54;C55;C56;C57;C58;C59;C60;C61;C62;C63;C64;C65;C66;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;; 
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
DECLARO BAJO JURAMENTO QUE LOS DATOS CONTENIDOS EN EL PRESENTE DOCUMENTO SON LA EXPRESION FIEL DE LA VERDAD, POR LO QUE ASUMO LA RESPONSABILIDAD CORRESPONDIENTE;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
RUT REPRESENTANTE LEGAL;;;; RUT DEL RESPONSABLE DE LA CONFECCIÓN DEL REGISTRO;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;`;

    return template.split('\n');
}

/**
 * Formatea una fila de datos con todas las 33 columnas
 */
export function formatCompleteDataRow(row: DJ1948Row): string {
    const splitRut = (rut: string): [string, string] => {
        const clean = rut.replace(/\./g, '').replace(/-/g, '');
        if (clean.length < 2) return [clean, ''];
        return [clean.slice(0, -1), clean.slice(-1)];
    };

    const [rutBody, rutDV] = splitRut(row.c2 || '');

    return [
        row.c1 || '',           // C1: Fecha
        rutBody,                // C2: RUT Body
        rutDV,                  // C2: RUT DV  
        row.c3 || '',           // C3: Tipo propietario
        row.c4 || 0,            // C4: Cantidad acciones
        row.c5 || 0,            // C5: Con crédito IDPC >2017
        0,                      // C6: Con crédito IDPC ≤2016 (no implementado)
        0,                      // C7: Crédito IDPC voluntario (no implementado)
        row.c8 || 0,            // C8: Sin derecho a crédito
        row.c9 || 0,            // C9: RAP
        row.c10 || 0,           // C10: Otras rentas
        row.c11 || 0,           // C11: Exceso distribuciones
        row.c12 || 0,           // C12: ISFUT
        row.c13 || 0,           // C13: Rentas hasta 1983
        row.c14 || 0,           // C14: Exentas IGC 18.401
        row.c15 || 0,           // C15: Exentas IGC/IA
        row.c16 || 0,           // C16: No constitutivos
        row.c17 || 0,           // C17: Sin devolución 2017-2019
        row.c18 || 0,           // C18: Con devolución 2017-2019
        row.c19 || 0,           // C19: Sin devolución 2020+
        0,                      // C20: Con devolución 2020+ (no implementado)
        0,                      // C21: Sujetos restitución - sin devolución
        0,                      // C22: Sujetos restitución - con devolución
        0,                      // C23: Rentas exentas - sin devolución
        0,                      // C24: Rentas exentas - con devolución
        0,                      // C25: Crédito IPE
        0,                      // C26: Hasta 2016 afectas - sin devolución
        0,                      // C27: Hasta 2016 afectas - con devolución
        0,                      // C28: Hasta 2016 exentas - sin devolución
        0,                      // C29: Hasta 2016 exentas - con devolución
        0,                      // C30: Crédito IPE hasta 2016
        0,                      // C31: Crédito tasa adicional
        0,                      // C32: Devolución capital
        row.c33 || ''           // C33: Número certificado
    ].join(';');
}

/**
 * Rellena la Sección A con datos del declarante
 */
export function fillSectionA(
    lines: string[],
    declarante: {
        rut: string;
        nombreRazonSocial: string;
        correoElectronico: string;
        periodo: string;
    }
): string[] {
    const result = [...lines];

    // Línea 8 (índice 7): ROL ÚNICO TRIBUTARIO
    const parts = result[7].split(';');
    parts[0] = declarante.rut;
    parts[2] = declarante.nombreRazonSocial;
    result[7] = parts.join(';');

    // Línea 12 (índice 11): CORREO Y PERIODO
    const parts2 = result[11].split(';');
    parts2[0] = declarante.correoElectronico;
    parts2[2] = declarante.periodo;
    result[11] = parts2.join(';');

    return result;
}

/**
 * Rellena el cuadro resumen
 */
export function fillResumen(
    lines: string[],
    totales: { [key: string]: number },
    totalCasos: number
): string[] {
    const result = [...lines];

    // Línea 45 (índice 44): Totales C36-C66
    const resumenValues = [
        totales.c4 || 0,   // C36: Total acciones
        totales.c5 || 0,   // C37: Con crédito IDPC >2017
        totales.c6 || 0,   // C38
        totales.c7 || 0,   // C39
        totales.c8 || 0,   // C40
        totales.c9 || 0,   // C41
        totales.c10 || 0,  // C42
        totales.c11 || 0,  // C43
        totales.c12 || 0,  // C44
        totales.c13 || 0,  // C45
        totales.c14 || 0,  // C46
        totales.c15 || 0,  // C47
        totales.c16 || 0,  // C48
        totales.c17 || 0,  // C49
        totales.c18 || 0,  // C50
        totales.c19 || 0,  // C51
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // C52-C65
        0,                  // C66: Retiros en exceso
        totalCasos          // Total casos
    ];

    result[44] = resumenValues.join(';') + ';'.repeat(150); // Padding

    return result;
}

/**
 * Genera CSV completo basado en template
 */
export function generateFromTemplate(data: DJ1948Data): string {
    let lines = loadTemplate();

    // Rellenar Sección A
    lines = fillSectionA(lines, {
        rut: data.declarante.rut,
        nombreRazonSocial: data.declarante.nombreRazonSocial,
        correoElectronico: data.declarante.correoElectronico,
        periodo: data.anioTributario
    });

    // Insertar filas de datos después de línea 24 (headers C1-C33)
    const dataRows = data.informados.map(row => formatCompleteDataRow(row));
    lines.splice(25, 0, ...dataRows);

    // Calcular totales
    const totales: { [key: string]: number } = {};
    for (let i = 1; i <= 33; i++) {
        totales[`c${i}`] = 0;
    }
    data.informados.forEach(row => {
        for (let i = 4; i <= 33; i++) {
            const key = `c${i}` as keyof DJ1948Row;
            const value = row[key];
            if (typeof value === 'number') {
                totales[`c${i}`] += value;
            }
        }
    });

    // Rellenar resumen (ajustar índice según cuántas filas se insertaron)
    const resumenIndex = 44 + dataRows.length;
    lines = fillResumen(lines, totales, data.informados.length);

    return lines.join('\r\n');
}

/**
 * Genera Excel completo basado en template usando XLSX
 */
export function generateExcelFromTemplate(data: DJ1948Data): any {
    const XLSX = require('xlsx');

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // Convertir el CSV template a array de arrays
    const csvLines = loadTemplate();
    const dataArray = csvLines.map(line => line.split(';'));

    // Rellenar Sección A (líneas 7, 9, 11)
    const rutParts = data.declarante.rut.split('-');
    dataArray[7][0] = rutParts[0] || data.declarante.rut;
    dataArray[7][2] = data.declarante.nombreRazonSocial;
    dataArray[11][0] = data.declarante.correoElectronico;
    dataArray[11][2] = data.anioTributario;

    // Insertar datos después de línea 24 (índice 24)
    const dataRows: any[] = [];
    data.informados.forEach(row => {
        const splitRut = (rut: string): [string, string] => {
            const clean = rut.replace(/\./g, '').replace(/-/g, '');
            if (clean.length < 2) return [clean, ''];
            return [clean.slice(0, -1), clean.slice(-1)];
        };

        const [rutBody, rutDV] = splitRut(row.c2 || '');

        const excelRow = [
            row.c1 || '',
            rutBody,
            rutDV,
            row.c3 || '',
            row.c4 || 0,
            row.c5 || 0,
            0, // C6
            0, // C7
            row.c8 || 0,
            row.c9 || 0,
            row.c10 || 0,
            row.c11 || 0,
            row.c12 || 0,
            row.c13 || 0,
            row.c14 || 0,
            row.c15 || 0,
            row.c16 || 0,
            row.c17 || 0,
            row.c18 || 0,
            row.c19 || 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // C20-C31
            0, // C32
            row.c33 || ''
        ];

        // Rellenar con columnas vacías hasta completar el ancho del template
        while (excelRow.length < dataArray[0].length) {
            excelRow.push('');
        }

        dataRows.push(excelRow);
    });

    // Insertar filas de datos
    dataArray.splice(25, 0, ...dataRows);

    // Calcular totales para el resumen
    const totales: number[] = new Array(33).fill(0);
    data.informados.forEach(row => {
        if (row.c4) totales[3] += row.c4;
        if (row.c5) totales[4] += row.c5;
        totales[5] = 0; // C6
        totales[6] = 0; // C7
        if (row.c8) totales[7] += row.c8;
        if (row.c9) totales[8] += row.c9;
        if (row.c10) totales[9] += row.c10;
        if (row.c11) totales[10] += row.c11;
        if (row.c12) totales[11] += row.c12;
        if (row.c13) totales[12] += row.c13;
        if (row.c14) totales[13] += row.c14;
        if (row.c15) totales[14] += row.c15;
        if (row.c16) totales[15] += row.c16;
        if (row.c17) totales[16] += row.c17;
        if (row.c18) totales[17] += row.c18;
        if (row.c19) totales[18] += row.c19;
        // C20-C32 ya son 0
    });

    // Actualizar línea de resumen (la línea 44 + número de filas insertadas)
    const resumenLineIndex = 44 + dataRows.length;
    if (dataArray[resumenLineIndex]) {
        dataArray[resumenLineIndex] = [
            totales[3], // C36: Total acciones
            ...totales.slice(4, 32), // C37-C65
            0, // C66: Retiros en exceso
            data.informados.length // Total casos
        ];
        // Rellenar con columnas vacías
        while (dataArray[resumenLineIndex].length < dataArray[0].length) {
            dataArray[resumenLineIndex].push('');
        }
    }

    // Crear worksheet desde el array
    const worksheet = XLSX.utils.aoa_to_sheet(dataArray);

    // Agregar al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DJ1948');

    return workbook;
}

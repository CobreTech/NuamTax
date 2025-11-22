/**
 * @file dj1948TransformService.ts
 * @description Servicio para transformar TaxQualification a formato DJ1948
 * Mapea los datos disponibles a las 35 columnas requeridas por el SII
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import { DJ1948Data, DJ1948Declarante, DJ1948Row, DJ1948RetiroExceso } from './dj1948Types'
import { validateAndFormatRUT } from '../utils/rutUtils'
import { calculateAllCredits, validateCreditosConfig } from './dj1948CreditCalculator'

/**
 * Transforma datos del usuario a Sección A (Declarante)
 */
export function transformDeclarante(userProfile: UserProfile, additionalData?: {
  domicilio?: string;
  comuna?: string;
  telefono?: string;
}): DJ1948Declarante {
  // Formatear RUT del declarante
  const rutFormatted = userProfile.Rut
    ? (validateAndFormatRUT(userProfile.Rut).formatted || userProfile.Rut)
    : '';

  return {
    rut: rutFormatted,
    nombreRazonSocial: `${userProfile.Nombre} ${userProfile.Apellido}`.trim(),
    domicilioPostal: additionalData?.domicilio || 'No especificado',
    comuna: additionalData?.comuna || 'No especificada',
    correoElectronico: userProfile.email || '',
    telefono: additionalData?.telefono || 'No especificado',
  }
}

/**
 * Transforma una calificación tributaria a una fila del DJ1948
 * Mapea factores F8-F16 a las columnas correspondientes según reglas tributarias
 * Los créditos C17-C32 se calculan automáticamente si existe creditosConfig
 */
export function transformQualificationToDJ1948Row(
  qualification: TaxQualification,
  rutReceptor: string = '',
  cantidadAcciones: number = 0,
  tipoPropietario: 1 | 2 = 2
): DJ1948Row {
  // Extraer fecha del período o usar fecha de modificación
  let fecha = '';
  try {
    // Intentar parsear el período (puede ser formato YYYY-MM-DD, YYYY-Q1, etc.)
    if (qualification.periodo.includes('-')) {
      const parts = qualification.periodo.split('-');
      if (parts.length === 3) {
        // Formato YYYY-MM-DD
        fecha = qualification.periodo;
      } else if (parts.length === 2 && parts[1].startsWith('Q')) {
        // Formato YYYY-Q1, usar último día del trimestre
        const year = parts[0];
        const quarter = parseInt(parts[1].substring(1));
        const lastDay = quarter === 1 ? '03-31' : quarter === 2 ? '06-30' : quarter === 3 ? '09-30' : '12-31';
        fecha = `${year}-${lastDay}`;
      } else {
        fecha = qualification.fechaUltimaModificacion.toISOString().split('T')[0];
      }
    } else {
      fecha = qualification.fechaUltimaModificacion.toISOString().split('T')[0];
    }
    // Convertir a formato DD.MM.AAAA
    const dateObj = new Date(fecha);
    fecha = `${String(dateObj.getDate()).padStart(2, '0')}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${dateObj.getFullYear()}`;
  } catch {
    fecha = qualification.fechaUltimaModificacion.toLocaleDateString('es-CL');
  }

  // Obtener monto base
  const montoBase = qualification.monto.valor || 0;

  // Mapear factores F8-F16 a columnas del DJ1948
  // Lógica: ValorColumna = MontoTotal * Factor
  // C5 se calcula como el remanente del monto total menos las rentas exentas/no constitutivas (C8-C16)

  const f8 = (qualification.factores.factor8 || 0) * montoBase;
  const f9 = (qualification.factores.factor9 || 0) * montoBase;
  const f10 = (qualification.factores.factor10 || 0) * montoBase;
  const f11 = (qualification.factores.factor11 || 0) * montoBase;
  const f12 = (qualification.factores.factor12 || 0) * montoBase;
  const f13 = (qualification.factores.factor13 || 0) * montoBase;
  const f14 = (qualification.factores.factor14 || 0) * montoBase;
  const f15 = (qualification.factores.factor15 || 0) * montoBase;
  const f16 = (qualification.factores.factor16 || 0) * montoBase;

  // Calcular C5 (Monto con derecho a crédito)
  // Se asume que lo que no está clasificado en C8-C16 es monto afecto normal (C5)
  const sumaRentasEspeciales = f8 + f9 + f10 + f11 + f12 + f13 + f14 + f15 + f16;
  const c5 = Math.max(0, montoBase - sumaRentasEspeciales);

  // Calcular créditos tributarios automáticamente si existe configuración
  let creditos = {
    c17: 0, c18: 0, c19: 0, c20: 0, c21: 0, c22: 0,
    c23: 0, c24: 0, c25: 0, c26: 0, c27: 0, c28: 0,
    c29: 0, c30: 0, c31: 0, c32: 0
  };

  if (qualification.creditosConfig) {
    try {
      // Validar configuración
      validateCreditosConfig(qualification.creditosConfig);

      // Calcular créditos según fórmulas del SII
      creditos = calculateAllCredits({
        c5: Math.round(c5),
        c6: 0,  // No implementado aún
        c7: 0,  // No implementado aún
        c8: Math.round(f8),
        c9: Math.round(f9),
        c10: Math.round(f10),
        c11: Math.round(f11),
        c12: Math.round(f12),
        c13: Math.round(f13),
        c14: Math.round(f14),
        c15: Math.round(f15),
        c16: Math.round(f16)
      }, qualification.creditosConfig);
    } catch (error) {
      console.warn('Error calculando créditos tributarios:', error);
      // Si hay error, usar créditos en 0
    }
  }

  // Formatear RUT receptor
  const rutReceptorFormatted = rutReceptor
    ? (validateAndFormatRUT(rutReceptor).formatted || rutReceptor)
    : '';

  return {
    c1: fecha,
    c2: rutReceptorFormatted,
    c3: tipoPropietario,
    c4: cantidadAcciones,

    // Afectos a impuestos
    c5: Math.round(c5),  // Con créditos IDPC desde 2017 (Calculado por diferencia)
    c6: 0,  // Con créditos IDPC hasta 2016
    c7: 0,  // Con derecho a crédito por pago IDPC voluntario
    c8: Math.round(f8),  // Sin derecho a crédito

    // Rentas con tributación cumplida
    c9: Math.round(f9),   // RAP y diferencia inicial
    c10: Math.round(f10),  // Otras rentas sin prioridad
    c11: Math.round(f11),  // Exceso distribuciones desproporcionadas
    c12: Math.round(f12),  // ISFUT Ley 20.780
    c13: Math.round(f13),  // Rentas hasta 31.12.1983 / ISFUT/ISIF

    // Rentas exentas
    c14: Math.round(f14),  // Exentas IGC artículo 11 Ley 18.401
    c15: Math.round(f15),  // Exentos IGC y/o IA

    // Ingresos no constitutivos
    c16: Math.round(f16),  // Ingresos no constitutivos de renta

    // Créditos tributarios (C17-C32) - Calculados automáticamente
    c17: creditos.c17,  // Sin derecho a devolución (2017-2019)
    c18: creditos.c18,  // Con derecho a devolución (2017-2019)
    c19: creditos.c19,  // Sin derecho a devolución (2020+)
    c20: creditos.c20,  // Con derecho a devolución (2020+)
    c21: creditos.c21,  // Sujeto a restitución - sin devolución
    c22: creditos.c22,  // Sujeto a restitución - con devolución
    c23: creditos.c23,  // Rentas exentas - sin devolución
    c24: creditos.c24,  // Rentas exentas - con devolución
    c25: creditos.c25,  // Crédito por IPE
    c26: creditos.c26,  // Pre-2017 rentas afectas - sin devolución
    c27: creditos.c27,  // Pre-2017 rentas afectas - con devolución
    c28: creditos.c28,  // Pre-2017 rentas exentas - sin devolución
    c29: creditos.c29,  // Pre-2017 rentas exentas - con devolución
    c30: creditos.c30,  // Pre-2017 crédito IPE
    c31: creditos.c31,  // Crédito ex Art. 21
    c32: creditos.c32,  // Devolución de capital

    c33: '',  // Número de certificado
  }
}

/**
 * Transforma un array de calificaciones a formato DJ1948 completo
 */
export function transformToDJ1948Data(
  qualifications: TaxQualification[],
  userProfile: UserProfile,
  anioTributario: string,
  additionalData?: {
    domicilio?: string;
    comuna?: string;
    telefono?: string;
    rutReceptor?: string;
    cantidadAcciones?: number;
    tipoPropietario?: 1 | 2;
  }
): DJ1948Data {
  const declarante = transformDeclarante(userProfile, additionalData);

  const informados: DJ1948Row[] = qualifications.map(qual =>
    transformQualificationToDJ1948Row(
      qual,
      additionalData?.rutReceptor || userProfile.Rut,
      additionalData?.cantidadAcciones || 0,
      additionalData?.tipoPropietario || 2
    )
  );

  // Retiros en exceso (vacío por defecto, se puede completar manualmente)
  const retirosExceso: DJ1948RetiroExceso[] = [];

  return {
    declarante,
    informados,
    retirosExceso,
    anioTributario,
    fechaGeneracion: new Date(),
  }
}

/**
 * Calcula los totales del cuadro resumen final
 */
export function calculateDJ1948Totales(data: DJ1948Data): { [key: string]: number } {
  const totales: { [key: string]: number } = {};

  // Inicializar todas las columnas numéricas
  for (let i = 1; i <= 35; i++) {
    totales[`c${i}`] = 0;
  }

  // Sumar valores de todas las filas de informados
  data.informados.forEach(row => {
    for (let i = 1; i <= 33; i++) {
      const key = `c${i}` as keyof DJ1948Row;
      const value = row[key];
      if (typeof value === 'number') {
        totales[`c${i}`] += value;
      }
    }
  });

  // Sumar valores de retiros en exceso
  data.retirosExceso.forEach(retiro => {
    totales.c35 += retiro.c35;
  });

  return totales;
}

/**
 * @file dj1948TransformService.ts
 * @description Servicio para transformar TaxQualification a formato DJ1948
 * Mapea los datos disponibles a las 35 columnas requeridas por el SII
 */

import { TaxQualification } from '../dashboard/components/types'
import { UserProfile } from '../context/AuthContext'
import { DJ1948Data, DJ1948Declarante, DJ1948Row, DJ1948RetiroExceso } from './dj1948Types'
import { validateAndFormatRUT } from '../utils/rutUtils'

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
 * Mapea factores F8-F19 a las columnas correspondientes según reglas tributarias
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

  // Mapear factores F8-F19 a columnas del DJ1948
  // Nota: Este mapeo es una aproximación. En un sistema real, se necesitarían
  // reglas de negocio más complejas basadas en el tipo de instrumento y mercado.
  
  // Por defecto, distribuir el monto según los factores activos
  // Si no hay factores activos, asignar a C8 (Sin derecho a crédito)
  const factorSum = Object.values(qualification.factores).reduce((acc, val) => acc + val, 0);
  
  // Estrategia simplificada: distribuir el monto proporcionalmente según factores
  // En producción, esto debería seguir las reglas tributarias específicas
  const hasActiveFactors = factorSum > 0;
  
  // Si tiene factores activos, asumimos que corresponde a créditos IDPC desde 2017 (C5)
  // Si no, va a sin derecho a crédito (C8)
  const montoConCredito = hasActiveFactors ? montoBase : 0;
  const montoSinCredito = !hasActiveFactors ? montoBase : 0;

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
    c5: montoConCredito,  // Con créditos IDPC desde 2017
    c6: 0,  // Con créditos IDPC hasta 2016 (requiere datos históricos)
    c7: 0,  // Con derecho a crédito por pago IDPC voluntario
    c8: montoSinCredito,  // Sin derecho a crédito
    
    // Rentas con tributación cumplida
    c9: 0,   // RAP y diferencia inicial
    c10: 0,  // Otras rentas sin prioridad
    c11: 0,  // Exceso distribuciones desproporcionadas
    c12: 0,  // ISFUT Ley 20.780
    c13: 0,  // Rentas hasta 31.12.1983 / ISFUT/ISIF
    
    // Rentas exentas
    c14: 0,  // Exentas IGC artículo 11 Ley 18.401
    c15: 0,  // Exentos IGC y/o IA
    
    // Ingresos no constitutivos
    c16: 0,  // Ingresos no constitutivos de renta
    
    // Créditos - Acumulados desde 01.01.2017 - No sujetos a restitución hasta 31.12.2019
    c17: 0,  // Sin derecho a devolución
    c18: 0,  // Con derecho a devolución
    
    // No sujetos a restitución desde 01.01.2020
    c19: 0,  // Sin derecho a devolución
    c20: 0,  // Con derecho a devolución
    
    // Sujetos a restitución
    c21: 0,  // Sin derecho a devolución
    c22: 0,  // Con derecho a devolución
    
    // Asociados a Rentas Exentas - Sujetos a restitución
    c23: 0,  // Sin derecho a devolución
    c24: 0,  // Con derecho a devolución
    c25: 0,  // Crédito por IPE
    
    // Acumulados hasta 31.12.2016 - Asociados a Rentas Afectas
    c26: 0,  // Sin derecho a devolución
    c27: 0,  // Con derecho a devolución
    
    // Asociados a Rentas Exentas hasta 31.12.2016
    c28: 0,  // Sin derecho a devolución
    c29: 0,  // Con derecho a devolución
    c30: 0,  // Crédito por IPE
    
    // Otros créditos
    c31: 0,  // Crédito por impuesto tasa adicional
    c32: 0,  // Devolución de capital
    c33: '', // Número de certificado
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


/**
 * @file taxValidationService.ts
 * @description Servicio de validación de datos tributarios
 * Implementa RF-03: Validación automática de factores
 * Los factores F8-F19 no deben sumar más de 1 (100%)
 */

import { TaxFactors, TaxQualification, ValidationError } from '../dashboard/components/types';

/**
 * Valida que la suma de los factores F8-F19 no supere 1 (100%)
 * RF-03: Validación automática de factores
 */
export function validateFactorsSum(factors: TaxFactors): { isValid: boolean; sum: number; error?: string } {
  const sum = 
    (factors.factor8 || 0) + 
    (factors.factor9 || 0) + 
    (factors.factor10 || 0) + 
    (factors.factor11 || 0) + 
    (factors.factor12 || 0) + 
    (factors.factor13 || 0) + 
    (factors.factor14 || 0) + 
    (factors.factor15 || 0) + 
    (factors.factor16 || 0) + 
    (factors.factor17 || 0) + 
    (factors.factor18 || 0) + 
    (factors.factor19 || 0);

  const isValid = sum <= 1;

  return {
    isValid,
    sum,
    error: isValid ? undefined : `La suma de los factores (${sum.toFixed(4)}) supera el límite permitido de 1 (100%)`
  };
}

/**
 * Valida un registro individual de calificación tributaria
 * Verifica todos los campos requeridos y las reglas de negocio
 */
export function validateTaxQualification(
  data: Partial<TaxQualification>,
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validar campos requeridos
  const tipoInstrumento = data.tipoInstrumento || '';
  const mercadoOrigen = data.mercadoOrigen || '';
  const periodo = data.periodo || '';
  const tipoCalificacion = data.tipoCalificacion || '';

  if (!tipoInstrumento || tipoInstrumento.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'tipoInstrumento',
      value: tipoInstrumento,
      message: 'El campo tipo de instrumento es requerido',
      errorType: 'validation'
    });
  }

  if (!mercadoOrigen || mercadoOrigen.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'mercadoOrigen',
      value: mercadoOrigen,
      message: 'El campo mercado de origen es requerido',
      errorType: 'validation'
    });
  }

  if (!periodo || periodo.trim() === '') {
    errors.push({
      row: rowNumber,
      field: 'periodo',
      value: periodo,
      message: 'El campo período es requerido',
      errorType: 'validation'
    });
  }

  // Validar monto
  const montoValor = data.monto?.valor;
  if (montoValor === undefined || montoValor === null) {
    errors.push({
      row: rowNumber,
      field: 'monto',
      value: montoValor,
      message: 'El campo monto es requerido',
      errorType: 'validation'
    });
  } else if (montoValor < 0) {
    errors.push({
      row: rowNumber,
      field: 'monto',
      value: montoValor,
      message: 'El monto no puede ser negativo',
      errorType: 'validation'
    });
  }

  // Validar factores
  const factores = data.factores;
  if (!factores) {
    errors.push({
      row: rowNumber,
      field: 'factores',
      value: factores,
      message: 'Los factores tributarios son requeridos',
      errorType: 'validation'
    });
  } else {
    // Validar cada factor individualmente
    const factorKeys = ['factor8', 'factor9', 'factor10', 'factor11', 'factor12', 'factor13', 
                        'factor14', 'factor15', 'factor16', 'factor17', 'factor18', 'factor19'];
    
    for (const key of factorKeys) {
      const value = factores[key as keyof TaxFactors];
      
      if (value === undefined || value === null) {
        errors.push({
          row: rowNumber,
          field: key,
          value: value,
          message: `El factor ${key.toUpperCase()} es requerido`,
          errorType: 'validation'
        });
      } else if (typeof value !== 'number' || isNaN(value)) {
        errors.push({
          row: rowNumber,
          field: key,
          value: value,
          message: `El factor ${key.toUpperCase()} debe ser un número válido`,
          errorType: 'format'
        });
      } else if (value < 0 || value > 1) {
        errors.push({
          row: rowNumber,
          field: key,
          value: value,
          message: `El factor ${key.toUpperCase()} debe estar entre 0 y 1`,
          errorType: 'validation'
        });
      }
    }

    // RF-03: Validar suma de factores
    if (errors.length === 0 || !errors.some(e => factorKeys.includes(e.field))) {
      const validation = validateFactorsSum(factores);
      if (!validation.isValid) {
        errors.push({
          row: rowNumber,
          field: 'factores',
          value: validation.sum,
          message: validation.error || 'La suma de factores supera el 100%',
          errorType: 'factorSum'
        });
      }
    }
  }

  return errors;
}

/**
 * Valida el formato de un período fiscal
 * Formatos aceptados: 2024-Q1, 2024-Q2, 2024-Q3, 2024-Q4, 2024-01, etc.
 */
export function validatePeriodFormat(period: string): boolean {
  const quarterPattern = /^\d{4}-Q[1-4]$/;
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  const yearPattern = /^\d{4}$/;
  
  return quarterPattern.test(period) || monthPattern.test(period) || yearPattern.test(period);
}

/**
 * Sanitiza y normaliza los datos antes de la validación
 */
export function sanitizeData(data: any): Partial<TaxQualification> {
  return {
    ...data,
    tipoInstrumento: typeof data.tipoInstrumento === 'string' ? data.tipoInstrumento.trim() : '',
    mercadoOrigen: typeof data.mercadoOrigen === 'string' ? data.mercadoOrigen.trim() : '',
    periodo: typeof data.periodo === 'string' ? data.periodo.trim() : '',
    tipoCalificacion: typeof data.tipoCalificacion === 'string' ? data.tipoCalificacion.trim() : '',
    monto: {
      valor: typeof data.monto?.valor === 'number' ? data.monto.valor : parseFloat(data.monto?.valor) || 0,
      moneda: typeof data.monto?.moneda === 'string' ? data.monto.moneda.trim().toUpperCase() : 'CLP',
    },
    esNoInscrita: data.esNoInscrita !== undefined ? data.esNoInscrita : false,
  };
}

/**
 * Verifica si dos calificaciones son duplicadas
 * Se considera duplicado si tienen el mismo instrumento, mercado y período
 */
export function isDuplicateQualification(
  qualification1: Partial<TaxQualification>,
  qualification2: Partial<TaxQualification>
): boolean {
  return (
    qualification1.tipoInstrumento === qualification2.tipoInstrumento &&
    qualification1.mercadoOrigen === qualification2.mercadoOrigen &&
    qualification1.periodo === qualification2.periodo &&
    qualification1.usuarioId === qualification2.usuarioId
  );
}

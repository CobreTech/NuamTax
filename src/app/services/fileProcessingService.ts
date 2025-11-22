/**
 * @file fileProcessingService.ts
 * @description Servicio de procesamiento de archivos CSV y Excel
 * Implementa RF-01: Carga masiva de datos tributarios
 * Soporta archivos CSV y Excel con validación de datos
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TaxQualification, TaxFactors, ProcessedRecord, ValidationError } from '../dashboard/components/types';
import { validateTaxQualification, sanitizeData } from './taxValidationService';

/**
 * Columnas esperadas en el archivo de carga masiva
 */
export const EXPECTED_COLUMNS = [
  'instrumento',
  'mercado',
  'periodo',
  'tipo_calificacion',
  'f8',
  'f9',
  'f10',
  'f11',
  'f12',
  'f13',
  'f14',
  'f15',
  'f16',
  'f17',
  'f18',
  'f19',
  'monto',
  'es_oficial'
];

/**
 * Interfaz para las filas del archivo CSV/Excel
 */
interface FileRow {
  instrumento: string;
  mercado: string;
  periodo: string;
  tipo_calificacion: string;
  f8: string | number;
  f9: string | number;
  f10: string | number;
  f11: string | number;
  f12: string | number;
  f13: string | number;
  f14: string | number;
  f15: string | number;
  f16: string | number;
  f17: string | number;
  f18: string | number;
  f19: string | number;
  monto: string | number;
  es_oficial: string | boolean;
}

/**
 * Convierte una fila del archivo a un objeto TaxQualification
 */
function rowToTaxQualification(row: FileRow, brokerId: string): Partial<TaxQualification> {
  const parseNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Reemplazar comas por puntos para decimales
      const cleaned = value.replace(',', '.');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  // Mapear factores según nueva estructura (factor8, factor9, ...)
  const factores: TaxFactors = {
    factor8: parseNumber(row.f8 || row.factor8),
    factor9: parseNumber(row.f9 || row.factor9),
    factor10: parseNumber(row.f10 || row.factor10),
    factor11: parseNumber(row.f11 || row.factor11),
    factor12: parseNumber(row.f12 || row.factor12),
    factor13: parseNumber(row.f13 || row.factor13),
    factor14: parseNumber(row.f14 || row.factor14),
    factor15: parseNumber(row.f15 || row.factor15),
    factor16: parseNumber(row.f16 || row.factor16),
    factor17: parseNumber(row.f17 || row.factor17),
    factor18: parseNumber(row.f18 || row.factor18),
    factor19: parseNumber(row.f19 || row.factor19),
  };

  // Obtener monto y moneda (por defecto CLP)
  const montoValor = parseNumber(row.monto || row.valor);
  const moneda = String(row.moneda || 'CLP').trim().toUpperCase();

  return {
    usuarioId: brokerId,
    rutContribuyente: row.rut_contribuyente || row.rutContribuyente || undefined,
    tipoInstrumento: String(row.instrumento || row.tipoInstrumento || '').trim(),
    mercadoOrigen: String(row.mercado || row.mercadoOrigen || '').trim(),
    periodo: String(row.periodo || '').trim(),
    tipoCalificacion: String(row.tipo_calificacion || row.tipoCalificacion || '').trim(),
    factores,
    monto: {
      valor: montoValor,
      moneda: moneda,
    },
    esNoInscrita: row.es_no_inscrita === 'true' || row.es_no_inscrita === true || row.es_no_inscrita === '1' ||
      row.esNoInscrita === true || row.esNoInscrita === 'true' ||
      (row.es_oficial === 'false' || row.es_oficial === false),
    fechaCreacion: new Date(),
    fechaUltimaModificacion: new Date(),
  };
}

/**
 * Procesa un archivo CSV
 * RF-01: Carga masiva de datos tributarios
 */
export async function processCSVFile(
  file: File,
  brokerId: string
): Promise<ProcessedRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<FileRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Normalizar nombres de columnas
        return header.toLowerCase().trim().replace(/\s+/g, '_');
      },
      complete: (results: Papa.ParseResult<FileRow>) => {
        try {
          const processedRecords: ProcessedRecord[] = [];

          results.data.forEach((row: FileRow, index: number) => {
            const rowNumber = index + 2; // +2 porque index es 0-based y la primera fila es el header

            try {
              const taxQualification = rowToTaxQualification(row, brokerId);
              const sanitized = sanitizeData(taxQualification);
              const validationErrors = validateTaxQualification(sanitized, rowNumber);

              if (validationErrors.length > 0) {
                processedRecords.push({
                  rowNumber,
                  data: null,
                  status: 'error',
                  errors: validationErrors,
                  isDuplicate: false,
                });
              } else {
                processedRecords.push({
                  rowNumber,
                  data: sanitized as TaxQualification,
                  status: 'success',
                  errors: [],
                  isDuplicate: false,
                });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
              processedRecords.push({
                rowNumber,
                data: null,
                status: 'error',
                errors: [{
                  row: rowNumber,
                  field: 'general',
                  value: row,
                  message: `Error al procesar la fila: ${errorMessage}`,
                  errorType: 'format'
                }],
                isDuplicate: false,
              });
            }
          });

          resolve(processedRecords);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => {
        reject(new Error(`Error al parsear CSV: ${error.message}`));
      }
    });
  });
}

/**
 * Procesa un archivo Excel (XLSX)
 * RF-01: Carga masiva de datos tributarios
 */
export async function processExcelFile(
  file: File,
  brokerId: string
): Promise<ProcessedRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('No se pudo leer el archivo'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON con headers (devuelve array de arrays)
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
          header: 1,
          defval: '',
        });

        if (jsonData.length === 0) {
          reject(new Error('El archivo está vacío'));
          return;
        }

        // La primera fila son los headers
        const headers = (jsonData[0] as any[]).map((h: any) =>
          String(h).toLowerCase().trim().replace(/\s+/g, '_')
        );

        const processedRecords: ProcessedRecord[] = [];

        // Procesar cada fila (saltando el header)
        for (let i = 1; i < jsonData.length; i++) {
          const rowArray = jsonData[i] as any[];
          const rowNumber = i + 1;

          // Convertir array a objeto usando los headers
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = rowArray[index];
          });

          try {
            const taxQualification = rowToTaxQualification(row as FileRow, brokerId);
            const sanitized = sanitizeData(taxQualification);
            const validationErrors = validateTaxQualification(sanitized, rowNumber);

            if (validationErrors.length > 0) {
              processedRecords.push({
                rowNumber,
                data: null,
                status: 'error',
                errors: validationErrors,
                isDuplicate: false,
              });
            } else {
              processedRecords.push({
                rowNumber,
                data: sanitized as TaxQualification,
                status: 'success',
                errors: [],
                isDuplicate: false,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            processedRecords.push({
              rowNumber,
              data: null,
              status: 'error',
              errors: [{
                row: rowNumber,
                field: 'general',
                value: row,
                message: `Error al procesar la fila: ${errorMessage}`,
                errorType: 'format'
              }],
              isDuplicate: false,
            });
          }
        }

        resolve(processedRecords);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        reject(new Error(`Error al procesar Excel: ${errorMessage}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Procesa un archivo según su tipo (CSV o Excel)
 * RF-01: Carga masiva de datos tributarios
 */
export async function processFile(
  file: File,
  brokerId: string
): Promise<ProcessedRecord[]> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  if (fileExtension === 'csv') {
    return processCSVFile(file, brokerId);
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    return processExcelFile(file, brokerId);
  } else {
    throw new Error('Formato de archivo no soportado. Use CSV o XLSX');
  }
}

/**
 * Genera una plantilla CSV de ejemplo para guiar a los usuarios
 */
export function generateTemplateCSV(): string {
  const headers = EXPECTED_COLUMNS.join(',');
  const exampleRow = [
    'Acción ABC',
    'BVC',
    '2024-Q1',
    'Dividendos',
    '0.1',
    '0.1',
    '0.1',
    '0.1',
    '0.1',
    '0.1',
    '0.1',
    '0.1',
    '0.05',
    '0.05',
    '0.05',
    '0.05',
    '15000',
    'false'
  ].join(',');

  return `${headers}\n${exampleRow}`;
}

/**
 * Descarga una plantilla CSV de ejemplo
 */
export function downloadTemplateCSV(): void {
  const csvContent = generateTemplateCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'plantilla_carga_masiva.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * ==============================================
 * CONTRIBUTOR-AWARE FILE PROCESSING
 * ==============================================
 */

import type { Contributor } from '../dashboard/components/types';
import {
  batchMatchContributors,
  countQualificationsByRut,
  enrichMatchesWithCounts,
  type ContributorMatch,
  type BatchMatchResult
} from './contributorMatchingService';

export type UploadMode = 'specific' | 'bulk';

export interface FileProcessingResultWithContributors {
  records: ProcessedRecord[];
  contributorMatches: Map<string, ContributorMatch>;
  stats: {
    totalRecords: number;
    validRecords: number;
    errorRecords: number;
    uniqueContributors: number;
    existingContributors: number;
    newContributors: number;
  };
}

/**
 * Procesa un archivo con detección y matching automático de contribuyentes
 * 
 * @param file - Archivo CSV o Excel a procesar
 * @param usuarioId - ID del usuario actual
 * @param mode - Modo de carga ('specific' o 'bulk')
 * @param selectedContributor - Contribuyente seleccionado (solo si mode = 'specific')
 * @returns Resultado con records procesados y contributor matches
 */
export async function processFileWithContributors(
  file: File,
  usuarioId: string,
  mode: UploadMode = 'bulk',
  selectedContributor?: Contributor
): Promise<FileProcessingResultWithContributors> {
  // 1. Procesar archivo normalmente (usa usuarioId como brokerId legacy)
  const records = await processFile(file, usuarioId);

  // 2. Extraer RUTs únicos de los registros
  const ruts: string[] = records
    .filter(r => r.data?.rutContribuyente)
    .map(r => r.data!.rutContribuyente!);

  let contributorMatches = new Map<string, ContributorMatch>();
  let batchResult: BatchMatchResult;

  if (mode === 'specific' && selectedContributor) {
    // Modo específico: asignar todos los registros al contribuyente seleccionado
    const match: ContributorMatch = {
      rut: selectedContributor.rut,
      rutRaw: selectedContributor.rutRaw,
      contributorId: selectedContributor.id,
      exists: true,
      nombre: selectedContributor.nombre,
      tipoPersona: selectedContributor.tipoPersona,
      qualificationCount: records.filter(r => r.status === 'success' || r.status === 'updated').length,
      isAutoCreated: false
    };

    contributorMatches.set(selectedContributor.rutRaw, match);

    batchResult = {
      matches: contributorMatches,
      totalUnique: 1,
      existingCount: 1,
      newCount: 0
    };

    // Asignar contributorId a todos los records exitosos
    records.forEach(record => {
      if ((record.status === 'success' || record.status === 'updated') && record.data) {
        record.data.contributorId = selectedContributor.id;
        record.data.rutContribuyente = selectedContributor.rut;
      }
    });
  } else {
    // Modo bulk: hacer batch matching de contribuyentes
    batchResult = await batchMatchContributors(ruts, usuarioId);
    contributorMatches = batchResult.matches;

    // Contar calificaciones por RUT
    const counts = countQualificationsByRut(records);

    // Enriquecer matches con conteos
    contributorMatches = enrichMatchesWithCounts(contributorMatches, counts);

    // Asignar contributorId a los records que tienen match existente
    records.forEach(record => {
      if ((record.status === 'success' || record.status === 'updated') && record.data?.rutContribuyente) {
        const rutRaw = record.data.rutContribuyente.replace(/[^0-9kK]/g, '');
        const match = contributorMatches.get(rutRaw);

        if (match) {
          // Si el contribuyente existe, asignar su ID
          if (match.exists && match.contributorId) {
            record.data.contributorId = match.contributorId;
          }
          // Si no existe, se creará posteriormente y se asignará el ID
        }
      }
    });
  }

  // 3. Calcular estadísticas
  const validRecords = records.filter(r => r.status === 'success' || r.status === 'updated').length;
  const errorRecords = records.filter(r => r.status === 'error').length;

  return {
    records,
    contributorMatches,
    stats: {
      totalRecords: records.length,
      validRecords,
      errorRecords,
      uniqueContributors: batchResult.totalUnique,
      existingContributors: batchResult.existingCount,
      newContributors: batchResult.newCount
    }
  };
}

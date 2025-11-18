/**
 * @file types.ts
 * @description Define las interfaces y tipos de TypeScript utilizados en toda la sección del dashboard.
 * Esto asegura la consistencia de los datos y mejora la legibilidad y mantenibilidad del código.
 */

// Define la estructura de factores tributarios (F8-F19)
// Según documentación: factores con nombres factor8, factor9, etc.
export interface TaxFactors {
  factor8: number;   // Factor 8 (0-1)
  factor9: number;   // Factor 9 (0-1)
  factor10: number;  // Factor 10 (0-1)
  factor11: number;  // Factor 11 (0-1)
  factor12: number;  // Factor 12 (0-1)
  factor13: number;  // Factor 13 (0-1)
  factor14: number;  // Factor 14 (0-1)
  factor15: number;  // Factor 15 (0-1)
  factor16: number;  // Factor 16 (0-1)
  factor17: number;  // Factor 17 (0-1)
  factor18: number;  // Factor 18 (0-1)
  factor19: number;  // Factor 19 (0-1)
}

// Define la estructura del monto según documentación
export interface Monto {
  valor: number;    // Valor numérico de la calificación
  moneda: string;   // Código de la divisa (ej. "CLP")
}

// Define la estructura de un objeto de Calificación Tributaria con factores detallados.
// Alineado con la documentación del diseño (contexto2.md - Tabla 7)
export interface TaxQualification {
  id: string;                    // Identificador único de la calificación.
  usuarioId: string;             // UID del corredor propietario (segregación) - antes brokerId
  rutContribuyente?: string;     // RUT del contribuyente (persona natural o jurídica) dueño de la calificación - para DJ1948
  tipoInstrumento: string;       // Tipo de instrumento financiero - antes instrument
  mercadoOrigen: string;          // Mercado de valores del instrumento - antes market
  periodo: string;                // Período tributario de la calificación (ej. 2024-12-31)
  esNoInscrita: boolean;         // Indica si corresponde a un valor no inscrito - antes isOfficial
  monto: Monto;                   // Objeto que agrupa el valor monetario y la divisa - antes amount
  factores: TaxFactors;           // Factores tributarios F8-F19
  fechaCreacion: Date;           // Fecha y hora de creación del registro - antes createdAt
  fechaUltimaModificacion: Date;  // Fecha y hora de última actualización - antes updatedAt
  // Campo adicional para compatibilidad con UI (tipo de calificación)
  tipoCalificacion?: string;      // Tipo de calificación (ej. Dividendos, Intereses) - opcional
}

// Define la estructura de un objeto de Calificación Tributaria (versión simplificada para UI).
export interface Qualification {
  id: string;          // Identificador único de la calificación.
  tipoInstrumento: string;  // Tipo de instrumento financiero.
  mercadoOrigen: string;      // Mercado de valores del instrumento.
  periodo: string;      // Período tributario de la calificación.
  factors: string;     // Rango de factores aplicados (ej. F8-F12).
  amount: string;      // Monto asociado a la calificación (formateado).
  lastUpdate: string;  // Fecha de la última actualización.
}

// Define la estructura de un registro en la lista de Actividad Reciente.
export interface RecentActivity {
  id: number;        // Identificador único de la actividad.
  action: string;    // Descripción de la acción realizada.
  time: string;      // Tiempo transcurrido desde que se realizó la acción.
  status: 'success' | 'warning' | 'error'; // Estado de la actividad para visualización.
}

// Define los errores de validación de un registro
export interface ValidationError {
  row: number;               // Número de fila con error
  field: string;             // Campo con error
  value: any;                // Valor que causó el error
  message: string;           // Mensaje de error
  errorType: 'validation' | 'duplicate' | 'format' | 'factorSum'; // Tipo de error
}

// Define el resultado del procesamiento de un registro
export interface ProcessedRecord {
  rowNumber: number;
  data: TaxQualification | null;
  status: 'success' | 'error' | 'updated';
  errors: ValidationError[];
  isDuplicate: boolean;
  existingId?: string;
}

// Define el resultado completo de la carga masiva
export interface BulkUploadResult {
  totalRecords: number;      // Total de registros procesados
  added: number;             // Registros nuevos agregados
  updated: number;           // Registros actualizados
  errors: number;            // Registros con errores
  successRecords: ProcessedRecord[];  // Registros exitosos
  errorRecords: ProcessedRecord[];    // Registros con errores
  processingTime: number;    // Tiempo de procesamiento en ms
}

// Define la estructura del objeto para la previsualización de un archivo cargado.
export interface FilePreview {
  fileName: string;    // Nombre del archivo.
  size: number;        // Tamaño del archivo en bytes.
  rows: number;        // Número total de filas detectadas en el archivo.
  columns: string[];   // Nombres de las columnas detectadas.
  preview: string[][]; // Muestra de las primeras filas de datos.
  summary: {           // Resumen del análisis del archivo.
    added: number;     // Registros a ser agregados.
    updated: number;   // Registros a ser actualizados.
    errors: number;    // Registros con errores.
  };
  validationErrors?: ValidationError[]; // Errores detectados en la validación
}

// Define la estructura de un elemento en el menú de navegación.
export interface MenuItem {
  id: string;      // Identificador único para la pestaña.
  label: string;   // Texto que se mostrará en el menú.
  icon: React.ReactNode;    // Componente de icono para representar la sección.
}

// Define los posibles valores para la pestaña activa en el dashboard.
export type ActiveTab = 'overview' | 'qualifications' | 'upload' | 'reports' | 'settings';

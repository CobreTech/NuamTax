/**
 * @file types.ts
 * @description Define las interfaces y tipos de TypeScript utilizados en toda la sección del dashboard.
 * Esto asegura la consistencia de los datos y mejora la legibilidad y mantenibilidad del código.
 */

// Define la estructura de factores tributarios (F8-F16)
// Estos factores determinan la distribución de montos de dividendos en las columnas DJ1948
// Los créditos tributarios (C17-C32) se calculan automáticamente según configuración del régimen
export interface TaxFactors {
  factor8?: number;   // C8: Sin derecho a crédito (0-1)
  factor9?: number;   // C9: RAP y diferencia inicial (0-1)
  factor10?: number;  // C10: Otras rentas sin prioridad (0-1)
  factor11?: number;  // C11: Exceso distribuciones desproporcionadas (0-1)
  factor12?: number;  // C12: ISFUT Ley 20.780 (0-1)
  factor13?: number;  // C13: Rentas hasta 1983 / ISFUT/ISIF (0-1)
  factor14?: number;  // C14: Exentas IGC Art. 11 Ley 18.401 (0-1)
  factor15?: number;  // C15: Exentos IGC y/o IA (0-1)
  factor16?: number;  // C16: Ingresos no constitutivos de renta (0-1)
  factor17?: number;  // C17: ISFUT (0-1)
  factor18?: number;  // C18: ISIF (0-1)
  factor19?: number;  // C19: Otros (0-1)
}

// Define la configuración para el cálculo automático de créditos tributarios (C17-C32)
export interface TaxCreditsConfig {
  regimenTributario: '14A' | '14D3';  // Régimen de la empresa declarante
  tasaIDPC: number;                    // Tasa IDPC aplicable (0-1, ej: 0.27 para 27%)
  anioTributario: number;              // Año tributario (ej: 2025)
  creditoConDevolucion: boolean;       // ¿Crédito con derecho a devolución?
  creditoSujetoRestitucion: boolean;   // ¿Sujeto a restitución Art. 56/63 LIR?
}

// Define la estructura del monto según documentación
export interface Monto {
  valor: number;    // Valor numérico de la calificación
  moneda: string;   // Código de la divisa (ej. "CLP")
}

// Define la estructura de un contribuyente (accionista, persona natural o jurídica)
export interface Contributor {
  id: string;                           // ID único del contribuyente
  rut: string;                          // RUT formateado (12.345.678-9)
  rutRaw: string;                       // RUT sin formato (123456789) para búsquedas
  nombre: string;                       // Nombre completo o razón social
  tipoPersona: 'NATURAL' | 'JURIDICA';  // Tipo de persona
  tipoSociedad?: 'SA_ABIERTA' | 'SA_CERRADA' | 'SPA' | 'LIMITADA' | 'INDIVIDUAL' | 'COMANDITA';
  correoElectronico?: string;           // Email de contacto
  telefono?: string;                    // Teléfono de contacto
  direccion?: string;                   // Dirección física

  // Estadísticas (calculadas dinámicamente)
  totalCalificaciones?: number;         // Total de calificaciones asociadas
  montoTotal?: number;                  // Suma de todos los montos
  ultimaCalificacion?: Date;            // Fecha de la última calificación

  // Metadata
  usuarioId: string;                    // Usuario propietario del contribuyente
  fechaCreacion: Date;                  // Fecha de creación del registro
  fechaUltimaModificacion: Date;        // Fecha de última actualización
  activo: boolean;                      // Si el contribuyente está activo (soft delete)
}

// Define las estadísticas de un contribuyente
export interface ContributorStats {
  contributorId: string;
  totalCalificaciones: number;
  montoTotal: number;
  montoPorMoneda: Record<string, number>; // { 'CLP': 1000000, 'USD': 5000 }
  ultimaCalificacion?: Date;
  periodosMasRecientes: string[];         // Últimos 5 períodos
  distribuciones: {
    porInstrumento: Record<string, number>;
    porMercado: Record<string, number>;
  };
}

// Define filtros para búsqueda de contribuyentes
export interface ContributorFilters {
  searchTerm?: string;                  // Búsqueda por RUT o nombre
  tipoPersona?: 'NATURAL' | 'JURIDICA' | 'ALL';
  activo?: boolean;
  sortBy?: 'nombre' | 'monto' | 'fecha' | 'calificaciones';
  sortOrder?: 'asc' | 'desc';
}

// Define la estructura de un objeto de Calificación Tributaria con factores detallados.
// Alineado con la documentación del diseño (contexto2.md - Tabla 7)
export interface TaxQualification {
  id: string;                    // Identificador único de la calificación.
  usuarioId: string;             // UID del corredor propietario (segregación) - antes brokerId
  contributorId?: string;        // ID del contribuyente asociado (si existe en catálogo)
  rutContribuyente?: string;     // RUT del contribuyente (persona natural o jurídica) dueño de la calificación - para DJ1948
  tipoInstrumento: string;       // Tipo de instrumento financiero - antes instrument
  mercadoOrigen: string;          // Mercado de valores del instrumento - antes market
  periodo: string;                // Período tributario de la calificación (ej. 2024-12-31)
  esNoInscrita: boolean;         // Indica si corresponde a un valor no inscrito - antes isOfficial
  monto: Monto;                   // Objeto que agrupa el valor monetario y la divisa - antes amount
  factores: TaxFactors;           // Factores tributarios F8-F16 (montos de dividendos)
  creditosConfig?: TaxCreditsConfig; // Configuración para cálculo de créditos tributarios (C17-C32)
  fechaCreacion: Date;           // Fecha y hora de creación del registro - antes createdAt
  fechaUltimaModificacion: Date;  // Fecha y hora de última actualización - antes updatedAt
  // Campo adicional para compatibiliad con UI (tipo de calificación)
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
export type ActiveTab = 'overview' | 'qualifications' | 'contributors' | 'upload' | 'reports' | 'settings';

// ============================================
// CONTRIBUTOR-AWARE BULK UPLOAD TYPES
// ============================================

// Modo de carga masiva
export type UploadMode = 'specific' | 'bulk';

// Match de contribuyente durante carga masiva
export interface ContributorMatch {
  rut: string;                    // Formatted RUT
  rutRaw: string;                 // Raw RUT for queries
  contributorId?: string;         // ID if contributor exists
  exists: boolean;                // Whether contributor already exists
  nombre: string;                 // Name (inferred or existing)
  tipoPersona: 'NATURAL' | 'JURIDICA';  // Person type (inferred or existing)
  qualificationCount: number;     // Number of qualifications in this upload
  isAutoCreated?: boolean;        // Whether it was auto-created
}

// ProcessedRecord con información de contribuyente
export interface ProcessedRecordWithContributor extends ProcessedRecord {
  contributorMatch?: ContributorMatch;
}

// Resultado de carga masiva con estadísticas de contribuyentes
export interface BulkUploadResultWithContributors extends BulkUploadResult {
  contributorsLinked: number;     // Contribuyentes existentes vinculados
  contributorsCreated: number;    // Contribuyentes nuevos creados
  contributorMatches: ContributorMatch[];  // Detalle completo de contribuyentes
}

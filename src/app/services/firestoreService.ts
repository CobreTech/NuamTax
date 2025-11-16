/**
 * @file firestoreService.ts
 * @description Servicio de Firestore para operaciones CRUD de calificaciones tributarias
 * Implementa RF-01: Carga masiva con actualización de registros existentes
 * Implementa RF-10: Segregación de datos por corredor
 */

'use client';

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TaxQualification, ProcessedRecord, BulkUploadResult } from '../dashboard/components/types';
import { isDuplicateQualification } from './taxValidationService';

// Nombre de la colección en Firestore (debe coincidir con las reglas de seguridad)
// Según documentación: colección "calificaciones"
const COLLECTION_NAME = 'calificaciones';

/**
 * Convierte un objeto TaxQualification a formato Firestore
 * Mapea los campos según la documentación del diseño
 */
function toFirestoreFormat(qualification: TaxQualification): any {
  return {
    usuarioId: qualification.usuarioId,
    tipoInstrumento: qualification.tipoInstrumento,
    mercadoOrigen: qualification.mercadoOrigen,
    periodo: qualification.periodo,
    esNoInscrita: qualification.esNoInscrita,
    monto: {
      valor: qualification.monto.valor,
      moneda: qualification.monto.moneda || 'CLP',
    },
    factores: qualification.factores,
    fechaCreacion: Timestamp.fromDate(qualification.fechaCreacion),
    fechaUltimaModificacion: Timestamp.fromDate(qualification.fechaUltimaModificacion),
    ...(qualification.tipoCalificacion && { tipoCalificacion: qualification.tipoCalificacion }),
  };
}

/**
 * Convierte un documento de Firestore a TaxQualification
 * Mapea los campos según la documentación del diseño (SOLO nuevo formato)
 */
function fromFirestoreFormat(doc: any): TaxQualification {
  const data = doc.data();
  return {
    id: doc.id,
    usuarioId: data.usuarioId || '',
    tipoInstrumento: data.tipoInstrumento || '',
    mercadoOrigen: data.mercadoOrigen || '',
    periodo: data.periodo || '',
    esNoInscrita: data.esNoInscrita !== undefined ? data.esNoInscrita : false,
    monto: data.monto && typeof data.monto === 'object' 
      ? { valor: data.monto.valor || 0, moneda: data.monto.moneda || 'CLP' }
      : { valor: 0, moneda: 'CLP' },
    factores: data.factores || {
      factor8: 0, factor9: 0, factor10: 0, factor11: 0, factor12: 0,
      factor13: 0, factor14: 0, factor15: 0, factor16: 0, factor17: 0,
      factor18: 0, factor19: 0,
    },
    fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
    fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate() || new Date(),
    tipoCalificacion: data.tipoCalificacion || '',
  } as TaxQualification;
}

/**
 * Genera un ID único para una calificación basado en sus datos
 */
function generateQualificationId(qualification: Partial<TaxQualification>): string {
  const usuarioId = qualification.usuarioId || '';
  const tipoInstrumento = qualification.tipoInstrumento || '';
  const mercadoOrigen = qualification.mercadoOrigen || '';
  const periodo = qualification.periodo || '';
  
  const normalized = `${usuarioId}-${tipoInstrumento}-${mercadoOrigen}-${periodo}`
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  
  return normalized;
}

/**
 * Busca una calificación existente que coincida con los criterios de duplicado
 * RF-01: Detectar registros duplicados para actualizar en lugar de crear nuevos
 */
export async function findExistingQualification(
  qualification: Partial<TaxQualification>
): Promise<TaxQualification | null> {
  try {
    const usuarioId = qualification.usuarioId || '';
    const tipoInstrumento = qualification.tipoInstrumento || '';
    const mercadoOrigen = qualification.mercadoOrigen || '';
    const periodo = qualification.periodo || '';
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where('usuarioId', '==', usuarioId),
      where('tipoInstrumento', '==', tipoInstrumento),
      where('mercadoOrigen', '==', mercadoOrigen),
      where('periodo', '==', periodo),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    return fromFirestoreFormat(querySnapshot.docs[0]);
  } catch (error) {
    console.error('Error buscando calificación existente:', error);
    return null;
  }
}

/**
 * Crea una nueva calificación tributaria
 * RF-10: Los datos se almacenan con el brokerId para segregación
 */
export async function createQualification(
  qualification: TaxQualification
): Promise<string> {
  try {
    const id = generateQualificationId(qualification);
    const qualificationWithId = { ...qualification, id };
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, toFirestoreFormat(qualificationWithId));
    
    return id;
  } catch (error) {
    console.error('Error creando calificación:', error);
    throw new Error('Error al guardar la calificación en la base de datos');
  }
}

/**
 * Actualiza una calificación tributaria existente
 * RF-01: Actualizar registros existentes en lugar de duplicarlos
 */
export async function updateQualification(
  id: string,
  qualification: Partial<TaxQualification>
): Promise<void> {
  try {
    // Obtener la calificación existente para preservar campos como fechaCreacion
    const existing = await getQualificationById(id);
    if (!existing) {
      throw new Error('Calificación no encontrada');
    }

    // Hacer merge con los datos existentes
    const updatedQualification: TaxQualification = {
      ...existing,
      ...qualification,
      fechaUltimaModificacion: new Date(),
      // Asegurar que monto tenga la estructura correcta
      monto: qualification.monto || existing.monto,
      // Asegurar que factores estén completos
      factores: qualification.factores || existing.factores,
    };

    const docRef = doc(db, COLLECTION_NAME, id);
    const updateData = toFirestoreFormat(updatedQualification);
    
    await setDoc(docRef, updateData, { merge: true });
  } catch (error) {
    console.error('Error actualizando calificación:', error);
    throw new Error('Error al actualizar la calificación en la base de datos');
  }
}

/**
 * Obtiene una calificación por su ID
 */
export async function getQualificationById(id: string): Promise<TaxQualification | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return fromFirestoreFormat(docSnap);
  } catch (error) {
    console.error('Error obteniendo calificación:', error);
    return null;
  }
}

/**
 * Obtiene todas las calificaciones de un corredor
 * RF-10: Segregación de datos por corredor
 */
export async function getQualificationsByBrokerId(
  brokerId: string,
  maxResults: number = 100
): Promise<TaxQualification[]> {
  try {
    if (!brokerId) {
      console.warn('[getQualificationsByBrokerId] brokerId vacío');
      return [];
    }

    // Buscar solo por usuarioId (nuevo formato)
    let results: TaxQualification[] = [];
    
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('usuarioId', '==', brokerId),
        orderBy('fechaUltimaModificacion', 'desc'),
        limit(maxResults)
      );
      const querySnapshot = await getDocs(q);
      results = querySnapshot.docs.map(fromFirestoreFormat);
    } catch (error: any) {
      // Si falla por falta de índice, intentar sin orderBy
      if (error?.code === 'failed-precondition') {
        const q = query(
          collection(db, COLLECTION_NAME),
          where('usuarioId', '==', brokerId),
          limit(maxResults)
        );
        const querySnapshot = await getDocs(q);
        results = querySnapshot.docs.map(fromFirestoreFormat);
        // Ordenar manualmente
        results.sort((a, b) => b.fechaUltimaModificacion.getTime() - a.fechaUltimaModificacion.getTime());
      } else {
        throw error;
      }
    }

    return results;
  } catch (error) {
    console.error('[getQualificationsByBrokerId] Error obteniendo calificaciones:', error);
    return [];
  }
}

/**
 * Procesa la carga masiva de calificaciones - OPTIMIZADO
 * RF-01: Carga masiva de datos tributarios con validación y actualización
 * RF-02: Resumen de carga masiva
 * RNF-04: Procesar hasta 5000 registros en menos de 2 minutos
 * 
 * OPTIMIZACIÓN:
 * 1. Una sola consulta inicial para obtener registros existentes
 * 2. Detección de duplicados en memoria (O(1) con Map)
 * 3. Batches de 500 operaciones ejecutados en paralelo
 * 4. Callback de progreso en tiempo real
 */
export async function processBulkUpload(
  processedRecords: ProcessedRecord[],
  brokerId: string,
  onProgress?: (current: number, total: number, phase: string) => void
): Promise<BulkUploadResult> {
  const startTime = Date.now();
  console.log(`[BULK UPLOAD] Iniciando carga masiva de ${processedRecords.length} registros...`);
  
  let added = 0;
  let updated = 0;
  let errors = 0;
  const successRecords: ProcessedRecord[] = [];
  const errorRecords: ProcessedRecord[] = [];

  try {
    // PASO 1: Obtener TODOS los registros existentes del corredor en UNA SOLA consulta
    console.log('[BULK UPLOAD] Obteniendo registros existentes...');
    onProgress?.(0, processedRecords.length, 'Cargando registros existentes...');
    
    const existingQuery = query(
      collection(db, COLLECTION_NAME),
      where('usuarioId', '==', brokerId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    // Crear un Map para búsqueda rápida O(1) de duplicados
    const existingMap = new Map<string, TaxQualification>();
    existingSnapshot.docs.forEach(doc => {
      const data = fromFirestoreFormat(doc);
      const key = `${data.tipoInstrumento}-${data.mercadoOrigen}-${data.periodo}`.toLowerCase();
      existingMap.set(key, data);
    });
    console.log(`✅ ${existingMap.size} registros existentes cargados en memoria`);
    onProgress?.(0, processedRecords.length, 'Preparando operaciones...');

    // PASO 2: Preparar operaciones en batches
    console.log('⚙️ Preparando operaciones por lotes...');
    const BATCH_SIZE = 500;
    const batches: any[] = [];
    let currentBatch = writeBatch(db);
    let operationsInBatch = 0;

    // Procesar cada registro
    let processedCount = 0;
    for (const record of processedRecords) {
      if (record.status === 'error' || !record.data) {
        errors++;
        errorRecords.push(record);
        processedCount++;
        continue;
      }

      // Buscar duplicado en memoria (O(1))
      const key = `${record.data.tipoInstrumento}-${record.data.mercadoOrigen}-${record.data.periodo}`.toLowerCase();
      const existing = existingMap.get(key);
      
      if (existing) {
        // Registro existente - actualizar
        record.isDuplicate = true;
        record.existingId = existing.id;
        record.status = 'updated';
        
        const docRef = doc(db, COLLECTION_NAME, existing.id);
        const updatedData: TaxQualification = {
          ...record.data,
          id: existing.id,
          fechaCreacion: existing.fechaCreacion,
          fechaUltimaModificacion: new Date(),
        };
        
        currentBatch.set(docRef, toFirestoreFormat(updatedData));
        operationsInBatch++;
        updated++;
        successRecords.push(record);
      } else {
        // Registro nuevo - crear
        const id = generateQualificationId(record.data);
        const newData: TaxQualification = {
          ...record.data,
          id,
          usuarioId: brokerId,
          fechaCreacion: new Date(),
          fechaUltimaModificacion: new Date(),
        };
        
        const docRef = doc(db, COLLECTION_NAME, id);
        currentBatch.set(docRef, toFirestoreFormat(newData));
        operationsInBatch++;
        added++;
        successRecords.push(record);
      }

      processedCount++;
      
      // Reportar progreso cada 100 registros o al final
      if (processedCount % 100 === 0 || processedCount === processedRecords.length) {
        onProgress?.(processedCount, processedRecords.length, 'Procesando registros...');
      }

      // Si alcanzamos el límite del batch, lo guardamos y creamos uno nuevo
      if (operationsInBatch >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = writeBatch(db);
        operationsInBatch = 0;
        console.log(`[BATCH] Batch ${batches.length} preparado (${BATCH_SIZE} operaciones)`);
      }
    }

    // Agregar el último batch si tiene operaciones
    if (operationsInBatch > 0) {
      batches.push(currentBatch);
      console.log(`[BATCH] Batch ${batches.length} preparado (${operationsInBatch} operaciones)`);
    }

    // PASO 3: Ejecutar todos los batches en PARALELO
    console.log(`[BATCH] Ejecutando ${batches.length} batches en paralelo...`);
    onProgress?.(processedRecords.length, processedRecords.length, 'Guardando en base de datos...');
    
    let completedBatches = 0;
    await Promise.all(batches.map(async (batch, index) => {
      console.log(`[BATCH] Ejecutando batch ${index + 1}/${batches.length}...`);
      await batch.commit();
      completedBatches++;
      onProgress?.(
        processedRecords.length, 
        processedRecords.length, 
        `Guardando batch ${completedBatches}/${batches.length}...`
      );
    }));

    const processingTime = Date.now() - startTime;
    console.log(`[SUCCESS] Carga masiva completada en ${(processingTime / 1000).toFixed(2)}s`);
    console.log(`[STATS] Agregados: ${added} | Actualizados: ${updated} | Errores: ${errors}`);

    return {
      totalRecords: processedRecords.length,
      added,
      updated,
      errors,
      successRecords,
      errorRecords,
      processingTime,
    };
  } catch (error) {
    console.error('❌ Error en carga masiva:', error);
    throw new Error('Error al procesar la carga masiva');
  }
}

/**
 * Busca calificaciones con filtros avanzados
 * RF-06: Búsqueda y filtrado avanzado
 */
export async function searchQualifications(
  brokerId: string,
  filters: {
    instrument?: string;
    market?: string;
    period?: string;
    qualificationType?: string;
    minAmount?: number;
    maxAmount?: number;
  }
): Promise<TaxQualification[]> {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('usuarioId', '==', brokerId)
    );

    // Aplicar filtros adicionales
    if (filters.instrument) {
      q = query(q, where('tipoInstrumento', '==', filters.instrument));
    }
    if (filters.market) {
      q = query(q, where('mercadoOrigen', '==', filters.market));
    }
    if (filters.period) {
      q = query(q, where('periodo', '==', filters.period));
    }
    if (filters.qualificationType) {
      q = query(q, where('tipoCalificacion', '==', filters.qualificationType));
    }

    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(fromFirestoreFormat);

    // Filtrar por rango de montos (cliente-side porque Firestore no soporta range queries con múltiples campos)
    if (filters.minAmount !== undefined) {
      results = results.filter(q => q.monto.valor >= filters.minAmount!);
    }
    if (filters.maxAmount !== undefined) {
      results = results.filter(q => q.monto.valor <= filters.maxAmount!);
    }

    return results;
  } catch (error) {
    console.error('Error buscando calificaciones:', error);
    return [];
  }
}

/**
 * Elimina una calificación por su ID
 * RF-04: Gestión de datos locales (eliminar)
 */
export async function deleteQualification(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, { deleted: true, deletedAt: Timestamp.now() }, { merge: true });
  } catch (error) {
    console.error('Error eliminando calificación:', error);
    throw new Error('Error al eliminar la calificación');
  }
}

/**
 * Obtiene estadísticas reales del corredor
 * Para mostrar en el dashboard
 */
export interface BrokerStats {
  totalQualifications: number;
  validatedFactors: number;
  reportsGenerated: number;
  successRate: number;
}

export async function getBrokerStats(brokerId: string): Promise<BrokerStats> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('usuarioId', '==', brokerId)
    );

    const querySnapshot = await getDocs(q);
    const qualifications = querySnapshot.docs.map(fromFirestoreFormat);
    
    const totalQualifications = qualifications.length;
    
    // Contar factores validados (suma <= 1)
    let validatedFactors = 0;
    qualifications.forEach(qual => {
      const sum = Object.values(qual.factores).reduce((acc, val) => acc + val, 0);
      if (sum <= 1) validatedFactors++;
    });
    
    // Reportes generados (simulado - implementar cuando exista la colección de reportes)
    const reportsGenerated = Math.floor(totalQualifications / 10);
    
    // Tasa de éxito
    const successRate = totalQualifications > 0 
      ? (validatedFactors / totalQualifications) * 100 
      : 100;

    return {
      totalQualifications,
      validatedFactors,
      reportsGenerated,
      successRate: parseFloat(successRate.toFixed(1))
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      totalQualifications: 0,
      validatedFactors: 0,
      reportsGenerated: 0,
      successRate: 0
    };
  }
}

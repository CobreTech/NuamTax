/**
 * Servicio de Firestore para operaciones CRUD de calificaciones tributarias
 * 
 * Proporciona funciones para crear, leer, actualizar y eliminar calificaciones
 * en Firestore. Implementa paginación automática para manejar grandes volúmenes
 * de datos y garantiza la segregación de datos por corredor mediante filtros
 * de seguridad. Soporta carga masiva con detección y actualización de duplicados.
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
  startAfter,
  Timestamp,
  writeBatch,
  QueryDocumentSnapshot,
  deleteDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TaxQualification, ProcessedRecord, BulkUploadResult } from '../dashboard/components/types';
import { isDuplicateQualification } from './taxValidationService';

// Nombre de la colección en Firestore (debe coincidir con las reglas de seguridad)
// Según documentación: colección "tax-qualifications"
const COLLECTION_NAME = 'tax-qualifications';

/**
 * Convierte un objeto TaxQualification a formato Firestore
 * Mapea los campos según la documentación del diseño
 */
function toFirestoreFormat(qualification: TaxQualification): any {
  return {
    usuarioId: qualification.usuarioId,
    ...(qualification.contributorId && { contributorId: qualification.contributorId }),
    ...(qualification.rutContribuyente && { rutContribuyente: qualification.rutContribuyente }),
    tipoInstrumento: qualification.tipoInstrumento,
    mercadoOrigen: qualification.mercadoOrigen,
    periodo: qualification.periodo,
    esNoInscrita: qualification.esNoInscrita,
    monto: {
      valor: qualification.monto.valor,
      moneda: qualification.monto.moneda || 'CLP',
    },
    factores: qualification.factores,
    ...(qualification.creditosConfig && { creditosConfig: qualification.creditosConfig }),
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
    contributorId: data.contributorId || undefined,
    rutContribuyente: data.rutContribuyente || undefined,
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
    creditosConfig: data.creditosConfig || undefined,
    fechaCreacion: data.fechaCreacion?.toDate() || new Date(),
    fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate() || new Date(),
    tipoCalificacion: data.tipoCalificacion || '',
  } as TaxQualification;
}

/**
 * Genera un ID único y legible para una calificación basado en sus datos
 * Formato: CAL-{tipoInstrumento}-{mercadoOrigen}-{periodo}-{usuarioIdShort}
 * Ejemplo: CAL-accion-nuam-bvc-2024-q1-a1b2c3d4
 */
function generateQualificationId(qualification: Partial<TaxQualification>): string {
  const usuarioId = qualification.usuarioId || '';
  const tipoInstrumento = qualification.tipoInstrumento || '';
  const mercadoOrigen = qualification.mercadoOrigen || '';
  const periodo = qualification.periodo || '';

  // Normalizar campos para que sean legibles pero válidos como ID
  const normalizeField = (field: string): string => {
    return field
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Espacios a guiones
      .replace(/[^a-z0-9-]/g, '')    // Eliminar caracteres especiales
      .replace(/-+/g, '-')            // Múltiples guiones a uno solo
      .replace(/^-|-$/g, '');         // Eliminar guiones al inicio/fin
  };

  const tipoNorm = normalizeField(tipoInstrumento) || 'sin-tipo';
  const mercadoNorm = normalizeField(mercadoOrigen) || 'sin-mercado';
  const periodoNorm = normalizeField(periodo) || 'sin-periodo';

  // Usar primeros 8 caracteres del usuarioId para mantener unicidad pero hacerlo más corto
  // Si el usuarioId es muy corto, usar un hash simple
  let usuarioIdShort = '';
  if (usuarioId.length >= 8) {
    usuarioIdShort = usuarioId.substring(0, 8).toLowerCase();
  } else if (usuarioId.length > 0) {
    // Si es muy corto, generar un hash simple
    let hash = 0;
    for (let i = 0; i < usuarioId.length; i++) {
      hash = ((hash << 5) - hash) + usuarioId.charCodeAt(i);
      hash = hash & hash;
    }
    usuarioIdShort = Math.abs(hash).toString(36).substring(0, 8);
  } else {
    usuarioIdShort = 'unknown';
  }

  // Construir ID legible: CAL-{tipo}-{mercado}-{periodo}-{usuarioIdShort}
  const id = `CAL-${tipoNorm}-${mercadoNorm}-${periodoNorm}-${usuarioIdShort}`;

  // Limitar longitud total (Firestore tiene límite de 1500 bytes para IDs)
  // Pero normalmente no debería exceder esto
  return id.length > 150 ? id.substring(0, 150) : id;
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

    // Actualizar estadísticas
    const isValid = Object.values(qualification.factores).reduce((a, b) => a + b, 0) <= 1;
    await updateUserStats(qualification.usuarioId, {
      qualifications: 1,
      validatedFactors: isValid ? 1 : 0
    });

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

    // Verificar cambio en validación de factores para actualizar stats
    if (qualification.factores) {
      const oldSum = Object.values(existing.factores || {}).reduce((a: any, b: any) => a + b, 0);
      const newSum = Object.values(qualification.factores).reduce((a: any, b: any) => a + b, 0);

      const wasValid = oldSum <= 1;
      const isValid = newSum <= 1;

      if (wasValid !== isValid) {
        await updateUserStats(existing.usuarioId, {
          validatedFactors: isValid ? 1 : -1
        });
      }
    }

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
  maxResults: number = 100 // Si es 0 o negativo, obtiene todas las calificaciones
): Promise<TaxQualification[]> {
  try {
    if (!brokerId) {
      console.warn('[getQualificationsByBrokerId] brokerId vacío');
      return [];
    }

    // Si maxResults es 0 o negativo, obtener todas las calificaciones con paginación
    const needsPagination = maxResults <= 0 || maxResults > 1000;
    const batchSize = 1000; // Límite máximo de Firestore por consulta
    let results: TaxQualification[] = [];
    let lastDoc: QueryDocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      try {
        let q;
        if (lastDoc) {
          q = query(
            collection(db, COLLECTION_NAME),
            where('usuarioId', '==', brokerId),
            orderBy('fechaUltimaModificacion', 'desc'),
            startAfter(lastDoc),
            limit(batchSize)
          );
        } else {
          q = query(
            collection(db, COLLECTION_NAME),
            where('usuarioId', '==', brokerId),
            orderBy('fechaUltimaModificacion', 'desc'),
            limit(needsPagination ? batchSize : maxResults)
          );
        }

        const querySnapshot = await getDocs(q);
        const batchResults = querySnapshot.docs.map(fromFirestoreFormat);
        results.push(...batchResults);

        // Verificar si hay más resultados
        hasMore = needsPagination && querySnapshot.docs.length === batchSize;
        if (hasMore && querySnapshot.docs.length > 0) {
          lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        }

        // Si hay un límite máximo y ya lo alcanzamos, detener
        if (maxResults > 0 && results.length >= maxResults) {
          hasMore = false;
        }
      } catch (error: any) {
        // Si falla por falta de índice, intentar sin orderBy
        if (error?.code === 'failed-precondition') {
          console.warn('[getQualificationsByBrokerId] Índice no disponible, consultando sin orderBy...', error);
          // Intentar sin orderBy
          let q;
          if (lastDoc) {
            q = query(
              collection(db, COLLECTION_NAME),
              where('usuarioId', '==', brokerId),
              startAfter(lastDoc),
              limit(batchSize)
            );
          } else {
            q = query(
              collection(db, COLLECTION_NAME),
              where('usuarioId', '==', brokerId),
              limit(needsPagination ? batchSize : maxResults)
            );
          }

          const querySnapshot = await getDocs(q);
          const batchResults = querySnapshot.docs.map(fromFirestoreFormat);
          results.push(...batchResults);

          // Ordenar manualmente
          results.sort((a, b) => b.fechaUltimaModificacion.getTime() - a.fechaUltimaModificacion.getTime());

          // Verificar si hay más resultados
          hasMore = needsPagination && querySnapshot.docs.length === batchSize;
          if (hasMore && querySnapshot.docs.length > 0) {
            lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
          }

          // Si hay un límite máximo y ya lo alcanzamos, detener
          if (maxResults > 0 && results.length >= maxResults) {
            hasMore = false;
          }
        } else {
          throw error;
        }
      }
    }

    // Limitar resultados si se especificó un límite
    if (maxResults > 0) {
      return results.slice(0, maxResults);
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
    // Paso 1: Obtener todos los registros existentes del corredor en una sola consulta
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

    // Paso 3: Ejecutar todos los batches en paralelo
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

    // Obtener documento antes de borrar para actualizar stats
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const isValid = Object.values(data.factores || {}).reduce((a: any, b: any) => a + b, 0) <= 1;

      await deleteDoc(docRef);

      await updateUserStats(data.usuarioId, {
        qualifications: -1,
        validatedFactors: isValid ? -1 : 0
      });
    } else {
      await deleteDoc(docRef);
    }
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

/**
 * Interfaz para la configuración de usuario
 */
export interface UserConfig {
  userId: string;
  dateFormat: string; // 'DD/MM/AAAA' | 'AAAA-MM-DD' | 'MM/DD/AAAA'
  decimalSeparator: 'coma' | 'punto';
  pageSize: number; // 10 | 25 | 50 | 100
  notifications: boolean;
  autoSave: boolean;
  fechaUltimaModificacion: Date;
}

const USER_CONFIG_COLLECTION = 'userConfigs';
const USER_STATS_COLLECTION = 'userStats';

/**
 * Actualiza las estadísticas del usuario de forma incremental
 */
async function updateUserStats(
  userId: string,
  change: {
    qualifications?: number,
    validatedFactors?: number,
    reports?: number
  }
) {
  try {
    const statsRef = doc(db, USER_STATS_COLLECTION, userId);
    const updates: any = {
      fechaUltimaActualizacion: Timestamp.now()
    };

    if (change.qualifications) updates.totalQualifications = increment(change.qualifications);
    if (change.validatedFactors) updates.validatedFactors = increment(change.validatedFactors);
    if (change.reports) updates.reportsGenerated = increment(change.reports);

    await setDoc(statsRef, updates, { merge: true });
  } catch (error) {
    console.error('Error actualizando estadísticas:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
}

/**
 * Guarda la configuración del usuario en Firestore
 */
export async function saveUserConfig(userId: string, config: Partial<UserConfig>): Promise<void> {
  try {
    if (!userId) {
      throw new Error('userId es requerido');
    }

    const configDocRef = doc(db, USER_CONFIG_COLLECTION, userId);

    const configData = {
      userId,
      dateFormat: config.dateFormat || 'DD/MM/AAAA',
      decimalSeparator: config.decimalSeparator || 'coma',
      pageSize: config.pageSize || 10,
      notifications: config.notifications !== undefined ? config.notifications : true,
      autoSave: config.autoSave !== undefined ? config.autoSave : true,
      fechaUltimaModificacion: Timestamp.fromDate(new Date()),
    };

    await setDoc(configDocRef, configData, { merge: true });

    console.log('[saveUserConfig] Configuración guardada exitosamente para usuario:', userId);
  } catch (error) {
    console.error('[saveUserConfig] Error guardando configuración:', error);
    throw error;
  }
}

/**
 * Obtiene la configuración del usuario desde Firestore
 */
export async function getUserConfig(userId: string): Promise<UserConfig | null> {
  try {
    if (!userId) {
      console.warn('[getUserConfig] userId vacío');
      return null;
    }

    const configDocRef = doc(db, USER_CONFIG_COLLECTION, userId);
    const configDocSnap = await getDoc(configDocRef);

    if (configDocSnap.exists()) {
      const data = configDocSnap.data();
      const config: UserConfig = {
        userId: data.userId,
        dateFormat: data.dateFormat || 'DD/MM/AAAA',
        decimalSeparator: data.decimalSeparator || 'coma',
        pageSize: data.pageSize || 10,
        notifications: data.notifications !== undefined ? data.notifications : true,
        autoSave: data.autoSave !== undefined ? data.autoSave : true,
        fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate() || new Date(),
      };

      console.log('[getUserConfig] Configuración cargada para usuario:', userId);
      return config;
    }

    console.log('[getUserConfig] No se encontró configuración para usuario:', userId);
    return null;
  } catch (error) {
    console.error('[getUserConfig] Error obteniendo configuración:', error);
    return null;
  }
}

/**
 * Obtiene las calificaciones más recientes de un corredor
 * Para mostrar en el OverviewSection
 */
export async function getRecentQualifications(
  brokerId: string,
  limitCount: number = 4
): Promise<TaxQualification[]> {
  try {
    if (!brokerId) {
      return [];
    }

    const qualifications = await getQualificationsByBrokerId(brokerId, limitCount);
    return qualifications.slice(0, limitCount);
  } catch (error) {
    console.error('[getRecentQualifications] Error obteniendo calificaciones recientes:', error);
    return [];
  }
}

export async function getBrokerStats(brokerId: string): Promise<BrokerStats> {
  try {
    // Intentar obtener estadísticas pre-calculadas
    const statsRef = doc(db, USER_STATS_COLLECTION, brokerId);
    const statsSnap = await getDoc(statsRef);

    if (statsSnap.exists()) {
      const data = statsSnap.data();
      const total = data.totalQualifications || 0;
      const validated = data.validatedFactors || 0;
      const reports = data.reportsGenerated || 0;

      return {
        totalQualifications: total,
        validatedFactors: validated,
        reportsGenerated: reports,
        successRate: total > 0 ? parseFloat(((validated / total) * 100).toFixed(1)) : 100
      };
    }

    // Fallback: Calcular si no existen (primera vez)
    console.log('Generando estadísticas iniciales...');
    const q = query(
      collection(db, COLLECTION_NAME),
      where('usuarioId', '==', brokerId)
    );

    const querySnapshot = await getDocs(q);
    const qualifications = querySnapshot.docs.map(fromFirestoreFormat);

    const totalQualifications = qualifications.length;
    let validatedFactors = 0;
    qualifications.forEach(qual => {
      const sum = Object.values(qual.factores).reduce((acc, val) => acc + val, 0);
      if (sum <= 1) validatedFactors++;
    });

    const reportsGenerated = Math.floor(totalQualifications / 10); // Simulado inicial

    // Guardar cálculo inicial
    await setDoc(statsRef, {
      totalQualifications,
      validatedFactors,
      reportsGenerated,
      fechaUltimaActualizacion: Timestamp.now()
    });

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

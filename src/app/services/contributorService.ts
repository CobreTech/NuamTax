/**
 * Servicio de Firestore para operaciones CRUD de contribuyentes
 * 
 * Proporciona funciones para crear, leer, actualizar y eliminar contribuyentes,
 * así como calcular estadísticas y manejar búsquedas.
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
    updateDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
    Contributor,
    ContributorStats,
    ContributorFilters,
    TaxQualification
} from '../dashboard/components/types';

// Nombre de la colección en Firestore
const CONTRIBUTORS_COLLECTION = 'contributors';
const QUALIFICATIONS_COLLECTION = 'tax-qualifications';

/**
 * Convierte un objeto Contributor a formato Firestore
 */
function toFirestoreFormat(contributor: Contributor): any {
    return {
        rut: contributor.rut,
        rutRaw: contributor.rutRaw,
        nombre: contributor.nombre,
        tipoPersona: contributor.tipoPersona,
        ...(contributor.tipoSociedad && { tipoSociedad: contributor.tipoSociedad }),
        ...(contributor.correoElectronico && { correoElectronico: contributor.correoElectronico }),
        ...(contributor.telefono && { telefono: contributor.telefono }),
        ...(contributor.direccion && { direccion: contributor.direccion }),
        usuarioId: contributor.usuarioId,
        fechaCreacion: Timestamp.fromDate(contributor.fechaCreacion),
        fechaUltimaModificacion: Timestamp.fromDate(contributor.fechaUltimaModificacion),
        activo: contributor.activo
    };
}

/**
 * Convierte un documento de Firestore a objeto Contributor
 */
function fromFirestore(doc: any): Contributor {
    const data = doc.data();
    return {
        id: doc.id,
        rut: data.rut,
        rutRaw: data.rutRaw,
        nombre: data.nombre,
        tipoPersona: data.tipoPersona,
        tipoSociedad: data.tipoSociedad,
        correoElectronico: data.correoElectronico,
        telefono: data.telefono,
        direccion: data.direccion,
        usuarioId: data.usuarioId,
        fechaCreacion: data.fechaCreacion?.toDate(),
        fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate(),
        activo: data.activo ?? true
    };
}

/**
 * Formatea RUT a formato estándar (12.345.678-9)
 */
export function formatRut(rut: string): string {
    const clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length < 2) return clean;

    const dv = clean.slice(-1);
    const number = clean.slice(0, -1);

    // Formatear con puntos
    const formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formatted}-${dv}`;
}

/**
 * Obtiene solo los dígitos del RUT (sin formato)
 */
export function getRutRaw(rut: string): string {
    return rut.replace(/[^0-9kK]/g, '');
}

/**
 * Valida formato de RUT chileno
 */
export function validateRut(rut: string): boolean {
    const clean = getRutRaw(rut);
    if (clean.length < 2) return false;

    const dv = clean.slice(-1).toUpperCase();
    const number = parseInt(clean.slice(0, -1), 10);

    // Algoritmo de validación del dígito verificador
    let sum = 0;
    let multiplier = 2;

    for (let i = number.toString().length - 1; i >= 0; i--) {
        sum += parseInt(number.toString()[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDv = 11 - (sum % 11);
    const calculatedDv = expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : expectedDv.toString();

    return dv === calculatedDv;
}

/**
 * Crea un nuevo contribuyente
 */
export async function createContributor(contributor: Omit<Contributor, 'id'>): Promise<string> {
    try {
        // Validar RUT
        if (!validateRut(contributor.rut)) {
            throw new Error('RUT inválido');
        }

        // Verificar si ya existe un contribuyente con ese RUT para este usuario
        const existing = await getContributorByRut(contributor.rut, contributor.usuarioId);
        if (existing) {
            throw new Error('Ya existe un contribuyente con este RUT');
        }

        const docRef = doc(collection(db, CONTRIBUTORS_COLLECTION));
        const now = new Date();

        const newContributor: Contributor = {
            ...contributor,
            id: docRef.id,
            rut: formatRut(contributor.rut),
            rutRaw: getRutRaw(contributor.rut),
            fechaCreacion: now,
            fechaUltimaModificacion: now,
            activo: true
        };

        await setDoc(docRef, toFirestoreFormat(newContributor));
        return docRef.id;
    } catch (error) {
        console.error('Error creating contributor:', error);
        throw error;
    }
}

/**
 * Obtiene un contribuyente por ID
 */
export async function getContributorById(id: string): Promise<Contributor | null> {
    try {
        const docRef = doc(db, CONTRIBUTORS_COLLECTION, id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        return fromFirestore(docSnap);
    } catch (error) {
        console.error('Error getting contributor:', error);
        throw error;
    }
}

/**
 * Obtiene un contribuyente por RUT
 */
export async function getContributorByRut(rut: string, userId: string): Promise<Contributor | null> {
    try {
        const rutRaw = getRutRaw(rut);
        const q = query(
            collection(db, CONTRIBUTORS_COLLECTION),
            where('rutRaw', '==', rutRaw),
            where('usuarioId', '==', userId),
            where('activo', '==', true),
            limit(1)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }

        return fromFirestore(querySnapshot.docs[0]);
    } catch (error) {
        console.error('Error getting contributor by RUT:', error);
        throw error;
    }
}

/**
 * Obtiene todos los contribuyentes de un usuario
 */
export async function getContributorsByUser(userId: string, filters?: ContributorFilters): Promise<Contributor[]> {
    try {
        let q = query(
            collection(db, CONTRIBUTORS_COLLECTION),
            where('usuarioId', '==', userId)
        );

        // Filtrar por activo
        if (filters?.activo !== undefined) {
            q = query(q, where('activo', '==', filters.activo));
        }

        // Filtrar por tipo de persona
        if (filters?.tipoPersona && filters.tipoPersona !== 'ALL') {
            q = query(q, where('tipoPersona', '==', filters.tipoPersona));
        }

        // Ordenar
        const sortField = filters?.sortBy === 'fecha' ? 'fechaCreacion' :
            filters?.sortBy === 'nombre' ? 'nombre' : 'fechaCreacion';
        // Intentar query con ordenamiento
        try {
            const qOrdered = query(q, orderBy(sortField, filters?.sortOrder || 'desc'));
            const querySnapshot = await getDocs(qOrdered);
            let contributors = querySnapshot.docs.map(doc => fromFirestore(doc));

            // ... (resto del código de filtrado y stats) ...
            // Filtro de búsqueda en cliente (Firestore no soporta búsqueda parcial)
            if (filters?.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                contributors = contributors.filter(c =>
                    c.nombre.toLowerCase().includes(searchLower) ||
                    c.rut.includes(searchLower) ||
                    c.rutRaw.includes(searchLower)
                );
            }

            // Si se ordena por monto o calificaciones, necesitamos calcular stats
            if (filters?.sortBy === 'monto' || filters?.sortBy === 'calificaciones') {
                const contributorsWithStats = await Promise.all(
                    contributors.map(async (c) => {
                        const stats = await calculateContributorStats(c.id);
                        return {
                            ...c,
                            totalCalificaciones: stats.totalCalificaciones,
                            montoTotal: stats.montoTotal
                        };
                    })
                );

                contributorsWithStats.sort((a, b) => {
                    const aValue = filters.sortBy === 'monto' ? (a.montoTotal || 0) : (a.totalCalificaciones || 0);
                    const bValue = filters.sortBy === 'monto' ? (b.montoTotal || 0) : (b.totalCalificaciones || 0);
                    return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
                });

                return contributorsWithStats;
            }

            return contributors;

        } catch (error: any) {
            // Si falla por falta de índice, intentar sin ordenamiento y ordenar en cliente
            if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                console.warn('Index missing, falling back to client-side sorting');
                const querySnapshot = await getDocs(q);
                let contributors = querySnapshot.docs.map(doc => fromFirestore(doc));

                // Ordenar en cliente
                contributors.sort((a: any, b: any) => {
                    const aValue = a[sortField];
                    const bValue = b[sortField];
                    if (filters?.sortOrder === 'asc') {
                        return aValue > bValue ? 1 : -1;
                    } else {
                        return aValue < bValue ? 1 : -1;
                    }
                });

                // Filtro de búsqueda en cliente
                if (filters?.searchTerm) {
                    const searchLower = filters.searchTerm.toLowerCase();
                    contributors = contributors.filter(c =>
                        c.nombre.toLowerCase().includes(searchLower) ||
                        c.rut.includes(searchLower) ||
                        c.rutRaw.includes(searchLower)
                    );
                }

                return contributors;
            }
            throw error;
        }
    } catch (error) {
        console.error('Error getting contributors:', error);
        throw error;
    }
}

/**
 * Actualiza un contribuyente
 */
export async function updateContributor(id: string, data: Partial<Contributor>): Promise<void> {
    try {
        const docRef = doc(db, CONTRIBUTORS_COLLECTION, id);
        const updates: any = {
            ...data,
            fechaUltimaModificacion: Timestamp.fromDate(new Date())
        };

        // Si se actualiza el RUT, actualizar también rutRaw
        if (data.rut) {
            if (!validateRut(data.rut)) {
                throw new Error('RUT inválido');
            }
            updates.rut = formatRut(data.rut);
            updates.rutRaw = getRutRaw(data.rut);
        }

        // Eliminar campos que no deben actualizarse
        delete updates.id;
        delete updates.usuarioId;
        delete updates.fechaCreacion;

        await updateDoc(docRef, updates);
    } catch (error) {
        console.error('Error updating contributor:', error);
        throw error;
    }
}

/**
 * Elimina un contribuyente (soft delete)
 */
export async function deleteContributor(id: string): Promise<void> {
    try {
        const docRef = doc(db, CONTRIBUTORS_COLLECTION, id);
        await updateDoc(docRef, {
            activo: false,
            fechaUltimaModificacion: Timestamp.fromDate(new Date())
        });
    } catch (error) {
        console.error('Error deleting contributor:', error);
        throw error;
    }
}

/**
 * Calcula las estadísticas de un contribuyente
 */
export async function calculateContributorStats(contributorId: string): Promise<ContributorStats> {
    try {
        // Obtener todas las calificaciones del contribuyente
        const q = query(
            collection(db, QUALIFICATIONS_COLLECTION),
            where('contributorId', '==', contributorId)
        );

        const querySnapshot = await getDocs(q);
        const qualifications: TaxQualification[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            qualifications.push({
                id: doc.id,
                usuarioId: data.usuarioId,
                contributorId: data.contributorId,
                rutContribuyente: data.rutContribuyente,
                tipoInstrumento: data.tipoInstrumento,
                mercadoOrigen: data.mercadoOrigen,
                periodo: data.periodo,
                esNoInscrita: data.esNoInscrita,
                monto: data.monto,
                factores: data.factores,
                creditosConfig: data.creditosConfig,
                fechaCreacion: data.fechaCreacion?.toDate(),
                fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate()
            });
        });

        // Calcular estadísticas
        const totalCalificaciones = qualifications.length;
        const montoPorMoneda: Record<string, number> = {};
        let montoTotal = 0;
        let ultimaCalificacion: Date | undefined = undefined;
        const periodos = new Set<string>();
        const porInstrumento: Record<string, number> = {};
        const porMercado: Record<string, number> = {};

        qualifications.forEach(q => {
            // Montos
            const monto = q.monto.valor;
            const moneda = q.monto.moneda;
            montoPorMoneda[moneda] = (montoPorMoneda[moneda] || 0) + monto;

            // Para el total, solo sumamos CLP
            if (moneda === 'CLP') {
                montoTotal += monto;
            }

            // Última calificación
            if (!ultimaCalificacion || q.fechaCreacion > ultimaCalificacion) {
                ultimaCalificacion = q.fechaCreacion;
            }

            // Períodos
            periodos.add(q.periodo);

            // Distribuciones
            porInstrumento[q.tipoInstrumento] = (porInstrumento[q.tipoInstrumento] || 0) + 1;
            porMercado[q.mercadoOrigen] = (porMercado[q.mercadoOrigen] || 0) + 1;
        });

        //Ordenar períodos y tomar los 5 más recientes
        const periodosMasRecientes = Array.from(periodos)
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 5);

        return {
            contributorId,
            totalCalificaciones,
            montoTotal,
            montoPorMoneda,
            ultimaCalificacion,
            periodosMasRecientes,
            distribuciones: {
                porInstrumento,
                porMercado
            }
        };
    } catch (error) {
        console.error('Error calculating contributor stats:', error);
        return {
            contributorId,
            totalCalificaciones: 0,
            montoTotal: 0,
            montoPorMoneda: {},
            periodosMasRecientes: [],
            distribuciones: {
                porInstrumento: {},
                porMercado: {}
            }
        };
    }
}

/**
 * Obtiene las calificaciones de un contribuyente
 */
export async function getQualificationsByContributor(contributorId: string): Promise<TaxQualification[]> {
    try {
        const q = query(
            collection(db, QUALIFICATIONS_COLLECTION),
            where('contributorId', '==', contributorId),
            orderBy('fechaCreacion', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const qualifications: TaxQualification[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            qualifications.push({
                id: doc.id,
                usuarioId: data.usuarioId,
                contributorId: data.contributorId,
                rutContribuyente: data.rutContribuyente,
                tipoInstrumento: data.tipoInstrumento,
                mercadoOrigen: data.mercadoOrigen,
                periodo: data.periodo,
                esNoInscrita: data.esNoInscrita,
                monto: data.monto,
                factores: data.factores,
                creditosConfig: data.creditosConfig,
                fechaCreacion: data.fechaCreacion?.toDate(),
                fechaUltimaModificacion: data.fechaUltimaModificacion?.toDate()
            });
        });

        return qualifications;
    } catch (error) {
        console.error('Error getting qualifications by contributor:', error);
        throw error;
    }
}

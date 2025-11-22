/**
 * Contributor Matching Service
 * 
 * Servicio para detectar, vincular y crear contribuyentes automáticamente
 * durante la carga masiva de calificaciones basado en el RUT.
 */

'use client';

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Contributor } from '../dashboard/components/types';
import { formatRut, getRutRaw, validateRut } from './contributorService';

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

export interface BatchMatchResult {
    matches: Map<string, ContributorMatch>;
    totalUnique: number;
    existingCount: number;
    newCount: number;
}

/**
 * Infiere el tipo de persona basado en el RUT
 * Heurística: RUT < 50.000.000 = NATURAL, >= 50.000.000 = JURIDICA
 */
export function inferPersonType(rutRaw: string): 'NATURAL' | 'JURIDICA' {
    const numericRut = parseInt(rutRaw);
    return numericRut < 50000000 ? 'NATURAL' : 'JURIDICA';
}

/**
 * Busca un contribuyente por RUT en Firestore
 */
export async function matchByRut(
    rut: string,
    usuarioId: string
): Promise<ContributorMatch | null> {
    try {
        // Validate RUT
        if (!validateRut(rut)) {
            return null;
        }

        const rutFormatted = formatRut(rut);
        const rutRaw = getRutRaw(rut);

        // Query Firestore
        const contributorsRef = collection(db, 'contributors');
        const q = query(
            contributorsRef,
            where('usuarioId', '==', usuarioId),
            where('rutRaw', '==', rutRaw),
            where('activo', '==', true)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Contributor exists
            const doc = snapshot.docs[0];
            const data = doc.data() as Contributor;

            return {
                rut: rutFormatted,
                rutRaw: rutRaw,
                contributorId: doc.id,
                exists: true,
                nombre: data.nombre,
                tipoPersona: data.tipoPersona,
                qualificationCount: 0, // Will be counted during processing
                isAutoCreated: false
            };
        } else {
            // Contributor doesn't exist - return match with inferred data
            return {
                rut: rutFormatted,
                rutRaw: rutRaw,
                exists: false,
                nombre: `Contribuyente ${rutFormatted}`,
                tipoPersona: inferPersonType(rutRaw),
                qualificationCount: 0,
                isAutoCreated: false
            };
        }
    } catch (error) {
        console.error('Error matching contributor by RUT:', error);
        return null;
    }
}

/**
 * Busca múltiples contribuyentes por RUT en batch (optimizado para archivos grandes)
 * Procesa en lotes de 100 para respetar límites de Firestore
 */
export async function batchMatchContributors(
    ruts: string[],
    usuarioId: string
): Promise<BatchMatchResult> {
    const matches = new Map<string, ContributorMatch>();
    const uniqueRuts = [...new Set(ruts.filter(r => r && validateRut(r)))];

    // Process in batches of 100 (Firestore 'in' query limit is 30, but we'll do individual queries)
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < uniqueRuts.length; i += BATCH_SIZE) {
        batches.push(uniqueRuts.slice(i, i + BATCH_SIZE));
    }

    let existingCount = 0;
    let newCount = 0;

    // Process each batch
    for (const batch of batches) {
        // Process batch in parallel
        const matchPromises = batch.map(rut => matchByRut(rut, usuarioId));
        const batchResults = await Promise.all(matchPromises);

        // Store results
        batchResults.forEach((match, index) => {
            if (match) {
                const originalRut = batch[index];
                matches.set(getRutRaw(originalRut), match);

                if (match.exists) {
                    existingCount++;
                } else {
                    newCount++;
                }
            }
        });
    }

    return {
        matches,
        totalUnique: uniqueRuts.length,
        existingCount,
        newCount
    };
}

/**
 * Crea un contribuyente automáticamente con información básica
 */
export async function autoCreateContributor(
    match: ContributorMatch,
    usuarioId: string
): Promise<string> {
    try {
        const now = Timestamp.now();

        const contributorData = {
            rut: match.rut,
            rutRaw: match.rutRaw,
            nombre: match.nombre,
            tipoPersona: match.tipoPersona,
            usuarioId: usuarioId,
            fechaCreacion: now,
            fechaUltimaModificacion: now,
            activo: true
        };

        const docRef = await addDoc(collection(db, 'contributors'), contributorData);

        return docRef.id;
    } catch (error) {
        console.error('Error auto-creating contributor:', error);
        throw error;
    }
}

/**
 * Crea múltiples contribuyentes en batch
 */
export async function batchCreateContributors(
    matches: ContributorMatch[],
    usuarioId: string,
    onProgress?: (current: number, total: number) => void
): Promise<Map<string, string>> {
    const createdIds = new Map<string, string>();
    const total = matches.length;

    for (let i = 0; i < matches.length; i++) {
        const match = matches[i];

        try {
            const id = await autoCreateContributor(match, usuarioId);
            createdIds.set(match.rutRaw, id);

            if (onProgress) {
                onProgress(i + 1, total);
            }
        } catch (error) {
            console.error(`Failed to create contributor for RUT ${match.rut}:`, error);
        }
    }

    return createdIds;
}

/**
 * Cuenta calificaciones por RUT en un conjunto de registros
 */
export function countQualificationsByRut(
    records: any[]
): Map<string, number> {
    const counts = new Map<string, number>();

    records.forEach(record => {
        if (record.data?.rutContribuyente) {
            const rutRaw = getRutRaw(record.data.rutContribuyente);
            counts.set(rutRaw, (counts.get(rutRaw) || 0) + 1);
        }
    });

    return counts;
}

/**
 * Enriquece los matches con el conteo de calificaciones
 */
export function enrichMatchesWithCounts(
    matches: Map<string, ContributorMatch>,
    counts: Map<string, number>
): Map<string, ContributorMatch> {
    const enriched = new Map<string, ContributorMatch>();

    matches.forEach((match, rutRaw) => {
        enriched.set(rutRaw, {
            ...match,
            qualificationCount: counts.get(rutRaw) || 0
        });
    });

    return enriched;
}

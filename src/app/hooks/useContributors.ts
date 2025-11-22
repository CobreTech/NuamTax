/**
 * Hook personalizado para gestión de contribuyentes
 * Proporciona estado y funciones para CRUD de contribuyentes
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Contributor,
    ContributorStats,
    ContributorFilters
} from '../dashboard/components/types';
import {
    createContributor,
    getContributorById,
    getContributorsByUser,
    updateContributor,
    deleteContributor,
    calculateContributorStats
} from '../services/contributorService';

export function useContributors(filters?: ContributorFilters) {
    const { user } = useAuth();
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cargar contribuyentes
    const loadContributors = useCallback(async () => {
        if (!user) {
            setContributors([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await getContributorsByUser(user.uid, filters);
            setContributors(data);
        } catch (err) {
            console.error('Error loading contributors:', err);
            setError('Error al cargar contribuyentes');
        } finally {
            setLoading(false);
        }
    }, [user, filters]);

    // Cargar al montar y cuando cambien los filtros
    useEffect(() => {
        loadContributors();
    }, [loadContributors]);

    // Crear contribuyente
    const create = useCallback(async (contributor: Omit<Contributor, 'id'>): Promise<string> => {
        if (!user) throw new Error('Usuario no autenticado');

        try {
            const id = await createContributor({ ...contributor, usuarioId: user.uid });
            await loadContributors(); // Recargar lista
            return id;
        } catch (err) {
            console.error('Error creating contributor:', err);
            throw err;
        }
    }, [user, loadContributors]);

    // Actualizar contribuyente
    const update = useCallback(async (id: string, data: Partial<Contributor>): Promise<void> => {
        try {
            await updateContributor(id, data);
            await loadContributors(); // Recargar lista
        } catch (err) {
            console.error('Error updating contributor:', err);
            throw err;
        }
    }, [loadContributors]);

    // Eliminar contribuyente
    const remove = useCallback(async (id: string): Promise<void> => {
        try {
            await deleteContributor(id);
            await loadContributors(); // Recargar lista
        } catch (err) {
            console.error('Error deleting contributor:', err);
            throw err;
        }
    }, [loadContributors]);

    // Obtener contribuyente por ID
    const getById = useCallback(async (id: string): Promise<Contributor | null> => {
        try {
            return await getContributorById(id);
        } catch (err) {
            console.error('Error getting contributor:', err);
            return null;
        }
    }, []);

    // Obtener estadísticas
    const getStats = useCallback(async (id: string): Promise<ContributorStats | null> => {
        try {
            return await calculateContributorStats(id);
        } catch (err) {
            console.error('Error getting stats:', err);
            return null;
        }
    }, []);

    return {
        contributors,
        loading,
        error,
        create,
        update,
        remove,
        getById,
        getStats,
        refresh: loadContributors
    };
}

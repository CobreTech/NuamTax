import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BrokerStats, getBrokerStats } from '../services/firestoreService';

/**
 * Hook para obtener estadísticas del corredor en tiempo real
 * 
 * Se suscribe a cambios en la colección de calificaciones para recalcular stats
 * automáticamente cuando se agregan/eliminan calificaciones (incluso desde Firebase Console).
 */
export function useRealTimeBrokerStats(brokerId: string | undefined) {
    const [stats, setStats] = useState<BrokerStats>({
        totalQualifications: 0,
        validatedFactors: 0,
        reportsGenerated: 0,
        successRate: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!brokerId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // Suscripción a cambios en la colección de calificaciones (NO userStats)
        // Esto garantiza que siempre tengamos los números correctos
        const qualificationsRef = collection(db, 'tax-qualifications');
        const q = query(qualificationsRef, where('usuarioId', '==', brokerId));

        const unsubscribe = onSnapshot(q, async () => {
            try {
                // Llamar a getBrokerStats que ahora calcula desde las calificaciones reales
                const freshStats = await getBrokerStats(brokerId);
                setStats(freshStats);
                setLoading(false);
            } catch (err) {
                console.error('Error obteniendo estadísticas:', err);
                setError('Error al cargar estadísticas');
                setLoading(false);
            }
        }, (err) => {
            console.error('Error suscribiendo a calificaciones:', err);
            setError('Error al subscribirse a cambios');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [brokerId]);

    return { stats, loading, error };
}

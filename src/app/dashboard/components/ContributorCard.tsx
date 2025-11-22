/**
 * Componente Card para mostrar información de un contribuyente
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Contributor, ContributorStats } from './types';
import { calculateContributorStats } from '@/app/services/contributorService';
import { FiEdit2, FiTrash2, FiUser, FiTrendingUp, FiCalendar, FiFileText } from 'react-icons/fi';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';

interface ContributorCardProps {
    contributor: Contributor;
    onEdit: (contributor: Contributor) => void;
    onDelete: (id: string) => void;
    onView: (contributor: Contributor) => void;
}

export function ContributorCard({ contributor, onEdit, onDelete, onView }: ContributorCardProps) {
    const [stats, setStats] = useState<ContributorStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoadingStats(true);
                const data = await calculateContributorStats(contributor.id);
                setStats(data);
            } catch (error) {
                console.error('Error loading stats:', error);
            } finally {
                setLoadingStats(false);
            }
        };

        loadStats();
    }, [contributor.id]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date?: Date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-CL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl hover:border-orange-400/50 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-200">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${contributor.tipoPersona === 'NATURAL' ? 'bg-blue-500/20' : 'bg-purple-500/20'
                            }`}>
                            {contributor.tipoPersona === 'NATURAL' ? (
                                <FiUser className={`w-6 h-6 ${contributor.tipoPersona === 'NATURAL' ? 'text-blue-400' : 'text-purple-400'
                                    }`} />
                            ) : (
                                <HiOutlineOfficeBuilding className="w-6 h-6 text-purple-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">
                                {contributor.nombre}
                            </h3>
                            <p className="text-sm text-gray-400">{contributor.rut}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onEdit(contributor)}
                            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                            title="Editar"
                        >
                            <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('¿Estás seguro de eliminar este contribuyente?')) {
                                    onDelete(contributor.id);
                                }
                            }}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar"
                        >
                            <FiTrash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                    {contributor.tipoSociedad && (
                        <div className="flex items-center gap-2 text-sm">
                            <HiOutlineOfficeBuilding className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">{contributor.tipoSociedad}</span>
                        </div>
                    )}
                    {contributor.correoElectronico && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">📧</span>
                            <span className="text-gray-400">{contributor.correoElectronico}</span>
                        </div>
                    )}
                </div>

                {/* Stats */}
                {loadingStats ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    </div>
                ) : stats && (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-white/10">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                                    <FiFileText className="w-4 h-4" />
                                    <span>Calificaciones</span>
                                </div>
                                <p className="text-2xl font-bold text-orange-400">
                                    {stats.totalCalificaciones}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                                    <FiTrendingUp className="w-4 h-4" />
                                    <span>Monto Total</span>
                                </div>
                                <p className="text-2xl font-bold text-amber-400">
                                    {formatCurrency(stats.montoTotal)}
                                </p>
                            </div>
                        </div>

                        {stats.ultimaCalificacion && (
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <FiCalendar className="w-4 h-4" />
                                <span>Última calificación: {formatDate(stats.ultimaCalificacion)}</span>
                            </div>
                        )}
                    </>
                )}

                {/* View Details Button */}
                <button
                    onClick={() => onView(contributor)}
                    className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-xl hover:from-orange-600/30 hover:to-amber-600/30 font-medium transition-all"
                >
                    Ver Detalles
                </button>
            </div>
        </div>
    );
}

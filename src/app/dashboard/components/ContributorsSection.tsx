/**
 * Sección principal de gestión de contribuyentes
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useContributors } from '@/app/hooks/useContributors';
import { Contributor, ContributorFilters } from './types';
import { ContributorCard } from './ContributorCard';
import { ContributorModal } from './ContributorModal';
import { FiSearch, FiPlus, FiFilter, FiUsers, FiSliders } from 'react-icons/fi';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';

export default function ContributorsSection() {
    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [tipoPersonaFilter, setTipoPersonaFilter] = useState<'ALL' | 'NATURAL' | 'JURIDICA'>('ALL');
    const [sortBy, setSortBy] = useState<'nombre' | 'monto' | 'fecha' | 'calificaciones'>('nombre');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

    // Build filters object
    const filters: ContributorFilters = useMemo(() => ({
        searchTerm,
        tipoPersona: tipoPersonaFilter,
        activo: true,
        sortBy,
        sortOrder
    }), [searchTerm, tipoPersonaFilter, sortBy, sortOrder]);

    // Use contributors hook
    const { contributors, loading, error, create, update, remove } = useContributors(filters);

    // Handlers
    const handleCreate = () => {
        setSelectedContributor(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleEdit = (contributor: Contributor) => {
        setSelectedContributor(contributor);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleView = (contributor: Contributor) => {
        // TODO: Navigate to contributor profile page
        console.log('View contributor:', contributor);
        alert(`Función "Ver Detalles" próximamente. Por ahora, usa Editar para ver información.`);
    };

    const handleSave = async (contributorData: Omit<Contributor, 'id'>) => {
        if (modalMode === 'create') {
            await create(contributorData);
        } else if (selectedContributor) {
            await update(selectedContributor.id, contributorData);
        }
    };

    const handleDelete = async (id: string) => {
        await remove(id);
    };

    // Stats
    const stats = useMemo(() => {
        const total = contributors.length;
        const naturales = contributors.filter(c => c.tipoPersona === 'NATURAL').length;
        const juridicas = contributors.filter(c => c.tipoPersona === 'JURIDICA').length;
        return { total, naturales, juridicas };
    }, [contributors]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Contribuyentes</h1>
                    <p className="text-gray-400 mt-1">Gestiona el catálogo de accionistas y contribuyentes</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-xl hover:from-orange-600/30 hover:to-amber-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <FiPlus className="w-5 h-5" />
                    Nuevo Contribuyente
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-500/20 rounded-xl">
                            <FiUsers className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Total</p>
                            <p className="text-2xl font-bold">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <FiUsers className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Personas Naturales</p>
                            <p className="text-2xl font-bold">{stats.naturales}</p>
                        </div>
                    </div>
                </div>

                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <HiOutlineOfficeBuilding className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Personas Jurídicas</p>
                            <p className="text-2xl font-bold">{stats.juridicas}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por RUT o nombre..."
                                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500"
                            />
                        </div>
                    </div>

                    {/* Tipo Persona Filter */}
                    <div>
                        <select
                            value={tipoPersonaFilter}
                            onChange={(e) => setTipoPersonaFilter(e.target.value as any)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                        >
                            <option value="ALL">Todos</option>
                            <option value="NATURAL">Personas Naturales</option>
                            <option value="JURIDICA">Personas Jurídicas</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white"
                        >
                            <option value="nombre">Ordenar por Nombre</option>
                            <option value="fecha">Ordenar por Fecha</option>
                            <option value="monto">Ordenar por Monto</option>
                            <option value="calificaciones">Ordenar por Calificaciones</option>
                        </select>
                    </div>
                </div>

                {/* Active filters display */}
                {(searchTerm || tipoPersonaFilter !== 'ALL') && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        <FiFilter className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Filtros activos:</span>
                        {searchTerm && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-sm rounded-lg border border-orange-500/30">
                                Búsqueda: "{searchTerm}"
                            </span>
                        )}
                        {tipoPersonaFilter !== 'ALL' && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-300 text-sm rounded-lg border border-orange-500/30">
                                {tipoPersonaFilter === 'NATURAL' ? 'Personas Naturales' : 'Personas Jurídicas'}
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setTipoPersonaFilter('ALL');
                            }}
                            className="text-sm text-orange-400 hover:text-orange-300 ml-auto"
                        >
                            Limpiar filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                        <p className="mt-4 text-gray-400">Cargando contribuyentes...</p>
                    </div>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {/* Contributors Grid */}
            {!loading && !error && (
                <>
                    {contributors.length === 0 ? (
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                            <FiUsers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                No hay contribuyentes
                            </h3>
                            <p className="text-gray-400 mb-6">
                                {searchTerm || tipoPersonaFilter !== 'ALL'
                                    ? 'No se encontraron contribuyentes con los filtros aplicados'
                                    : 'Comienza agregando tu primer contribuyente'
                                }
                            </p>
                            {(!searchTerm && tipoPersonaFilter === 'ALL') && (
                                <button
                                    onClick={handleCreate}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/50 rounded-xl hover:from-orange-600/30 hover:to-amber-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <FiPlus className="w-5 h-5" />
                                    Agregar Contribuyente
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {contributors.map(contributor => (
                                <ContributorCard
                                    key={contributor.id}
                                    contributor={contributor}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onView={handleView}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            <ContributorModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedContributor(null);
                }}
                onSave={handleSave}
                contributor={selectedContributor}
                mode={modalMode}
            />
        </div>
    );
}

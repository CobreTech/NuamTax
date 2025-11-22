/**
 * Modal para crear y editar contribuyentes
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Contributor } from './types';
import { formatRut, validateRut } from '@/app/services/contributorService';
import Icons from '@/app/utils/icons';
import CustomDropdown from '@/app/components/CustomDropdown';
import Portal from '@/app/components/Portal';

const X = Icons.Close;

interface ContributorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (contributor: Omit<Contributor, 'id'>) => Promise<void>;
    contributor?: Contributor | null;
    mode: 'create' | 'edit';
}

export function ContributorModal({ isOpen, onClose, onSave, contributor, mode }: ContributorModalProps) {
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        tipoPersona: 'NATURAL' as 'NATURAL' | 'JURIDICA',
        tipoSociedad: '' as string,
        correoElectronico: '',
        telefono: '',
        direccion: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    // Cargar datos del contribuyente si está editando
    useEffect(() => {
        if (isOpen) {
            if (contributor && mode === 'edit') {
                setFormData({
                    rut: contributor.rut,
                    nombre: contributor.nombre,
                    tipoPersona: contributor.tipoPersona,
                    tipoSociedad: contributor.tipoSociedad || '',
                    correoElectronico: contributor.correoElectronico || '',
                    telefono: contributor.telefono || '',
                    direccion: contributor.direccion || ''
                });
            } else {
                // Reset form for create mode
                setFormData({
                    rut: '',
                    nombre: '',
                    tipoPersona: 'NATURAL',
                    tipoSociedad: '',
                    correoElectronico: '',
                    telefono: '',
                    direccion: ''
                });
            }
            setErrors({});
        }
    }, [contributor, mode, isOpen]);

    const handleRutChange = (value: string) => {
        // Auto-format RUT as user types
        const formatted = formatRut(value);
        setFormData(prev => ({ ...prev, rut: formatted }));

        // Validate
        if (value && !validateRut(formatted)) {
            setErrors(prev => ({ ...prev, rut: 'RUT inválido' }));
        } else {
            setErrors(prev => ({ ...prev, rut: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const newErrors: Record<string, string> = {};

        if (!formData.rut) {
            newErrors.rut = 'RUT es requerido';
        } else if (!validateRut(formData.rut)) {
            newErrors.rut = 'RUT inválido';
        }

        if (!formData.nombre) {
            newErrors.nombre = 'Nombre es requerido';
        }

        if (formData.tipoPersona === 'JURIDICA' && !formData.tipoSociedad) {
            newErrors.tipoSociedad = 'Tipo de sociedad es requerido para personas jurídicas';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setIsSaving(true);

            const contributorData: any = {
                rut: formData.rut,
                nombre: formData.nombre,
                tipoPersona: formData.tipoPersona,
                ...(formData.tipoSociedad && { tipoSociedad: formData.tipoSociedad }),
                ...(formData.correoElectronico && { correoElectronico: formData.correoElectronico }),
                ...(formData.telefono && { telefono: formData.telefono }),
                ...(formData.direccion && { direccion: formData.direccion })
            };

            await onSave(contributorData);
            onClose();
        } catch (error: any) {
            setErrors({ submit: error.message || 'Error al guardar contribuyente' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const tipoPersonaOptions = [
        { value: 'NATURAL', label: 'Persona Natural' },
        { value: 'JURIDICA', label: 'Persona Jurídica' }
    ];

    const tipoSociedadOptions = [
        { value: '', label: 'Seleccionar...' },
        { value: 'SA_ABIERTA', label: 'S.A. Abierta' },
        { value: 'SA_CERRADA', label: 'S.A. Cerrada' },
        { value: 'SPA', label: 'SpA' },
        { value: 'LIMITADA', label: 'Limitada' },
        { value: 'COMANDITA', label: 'Comandita por Acciones' },
        { value: 'INDIVIDUAL', label: 'Empresa Individual' }
    ];

    return (
        <Portal>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div
                    ref={modalRef}
                    className="backdrop-blur-xl bg-slate-900/95 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <h2 className="text-2xl font-bold">
                            {mode === 'create' ? 'Nuevo Contribuyente' : 'Editar Contribuyente'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* RUT */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                RUT <span className="text-orange-400">*</span>
                            </label>
                            <input
                                ref={firstInputRef}
                                type="text"
                                value={formData.rut}
                                onChange={(e) => handleRutChange(e.target.value)}
                                className={`w-full px-4 py-2.5 bg-white/5 border ${errors.rut ? 'border-red-500/50' : 'border-white/10'
                                    } rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-colors`}
                                placeholder="12.345.678-9"
                                disabled={mode === 'edit'}
                            />
                            {errors.rut && <p className="mt-1.5 text-sm text-red-400">{errors.rut}</p>}
                        </div>

                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nombre / Razón Social <span className="text-orange-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                className={`w-full px-4 py-2.5 bg-white/5 border ${errors.nombre ? 'border-red-500/50' : 'border-white/10'
                                    } rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-colors`}
                                placeholder="Juan Pérez / Empresa S.A."
                            />
                            {errors.nombre && <p className="mt-1.5 text-sm text-red-400">{errors.nombre}</p>}
                        </div>

                        {/* Tipo Persona */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Tipo de Persona <span className="text-orange-400">*</span>
                            </label>
                            <CustomDropdown
                                options={tipoPersonaOptions}
                                value={formData.tipoPersona}
                                onChange={(value) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        tipoPersona: value as 'NATURAL' | 'JURIDICA',
                                        tipoSociedad: value === 'NATURAL' ? '' : prev.tipoSociedad
                                    }));
                                }}
                                placeholder="Seleccionar tipo de persona"
                            />
                        </div>

                        {/* Tipo Sociedad (solo para jurídicas) */}
                        {formData.tipoPersona === 'JURIDICA' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Tipo de Sociedad <span className="text-orange-400">*</span>
                                </label>
                                <CustomDropdown
                                    options={tipoSociedadOptions}
                                    value={formData.tipoSociedad}
                                    onChange={(value) => setFormData(prev => ({ ...prev, tipoSociedad: value as string }))}
                                    placeholder="Seleccionar tipo de sociedad"
                                />
                                {errors.tipoSociedad && <p className="mt-1.5 text-sm text-red-400">{errors.tipoSociedad}</p>}
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                value={formData.correoElectronico}
                                onChange={(e) => setFormData(prev => ({ ...prev, correoElectronico: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-colors"
                                placeholder="correo@ejemplo.com"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.telefono}
                                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-colors"
                                placeholder="+56 9 1234 5678"
                            />
                        </div>

                        {/* Dirección */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Dirección
                            </label>
                            <textarea
                                value={formData.direccion}
                                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500 transition-colors resize-none"
                                rows={3}
                                placeholder="Calle 123, Comuna, Ciudad"
                            />
                        </div>

                        {/* Error Message */}
                        {errors.submit && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                <p className="text-sm text-red-400">{errors.submit}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-2.5 border border-white/10 text-gray-300 rounded-xl hover:bg-white/5 font-medium transition-colors"
                                disabled={isSaving}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Icons.Refresh className="w-4 h-4 animate-spin" />
                                        Guardando...
                                    </span>
                                ) : (
                                    mode === 'create' ? 'Crear Contribuyente' : 'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
}

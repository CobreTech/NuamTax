"use client";

import { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { useAuth } from '@/app/context/AuthContext';
import { logUserUpdated } from '@/app/services/auditService';
import CustomDropdown from '@/app/components/CustomDropdown';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function EditUserModal({ open, onClose, userId, onSuccess }: EditUserModalProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState<'Corredor' | 'Administrador'>('Corredor');
  const [rut, setRut] = useState('');

  const [originalData, setOriginalData] = useState<any>(null);

  useEffect(() => {
    if (open && userId) {
      loadUserData();
    }
  }, [open, userId]);

  const loadUserData = async () => {
    try {
      setLoadingData(true);
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setNombre(data.Nombre || '');
        setApellido(data.Apellido || '');
        setEmail(data.email || '');
        setRol(data.rol || 'Corredor');
        setRut(data.Rut || '');
        setOriginalData(data);
      }
    } catch (err) {
      console.error('Error cargando usuario:', err);
      setError('Error al cargar los datos del usuario');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', userId);

      const updatedData = {
        Nombre: nombre,
        Apellido: apellido,
        email: email,
        rol: rol,
        Rut: rut,
      };

      await updateDoc(userRef, updatedData);

      // Registrar en auditoría
      if (userProfile) {
        await logUserUpdated(
          userProfile.uid,
          userProfile.email,
          `${userProfile.Nombre} ${userProfile.Apellido}`,
          userId,
          originalData,
          updatedData
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error actualizando usuario:', err);
      setError('Error al actualizar el usuario');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md m-4">
        <form
          onSubmit={handleSubmit}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold">Editar Usuario</h2>
            <p className="text-sm text-gray-400 mt-2">Actualiza la información del usuario</p>
          </div>

          {loadingData ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <p className="text-gray-400 mt-2">Cargando datos...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Apellido</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">RUT</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="12.345.678-9"
                  required
                />
              </div>

              <div>
                <CustomDropdown
                  label="Rol"
                  value={rol}
                  onChange={(val) => setRol(val as 'Corredor' | 'Administrador')}
                  options={[
                    { value: "Corredor", label: "Corredor" },
                    { value: "Administrador", label: "Administrador" },
                  ]}
                />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-sm rounded-xl p-3 text-center">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || loadingData}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

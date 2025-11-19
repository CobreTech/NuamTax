"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '@/app/firebase/config';
import { useAuth } from '@/app/context/AuthContext';
import RegisterModal from '@/app/components/RegisterModal';
import EditUserModal from './EditUserModal';
import { logUserToggleActive, logPasswordReset } from '@/app/services/auditService';
import Icons from '@/app/utils/icons';
import CustomDropdown from '@/app/components/CustomDropdown';

interface User {
  uid: string;
  Nombre: string;
  Apellido: string;
  Rut: string;
  email: string;
  rol: 'Corredor' | 'Administrador';
  FechaCreacion?: any;
  activo?: boolean;
}

/**
 * Componente de Gestión de Usuarios
 * 
 * Permite a los administradores:
 * - Ver lista completa de usuarios
 * - Crear nuevos usuarios
 * - Editar información de usuarios
 * - Desactivar/Activar usuarios
 * - Buscar y filtrar usuarios
 */
export default function UsersManagement() {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'Corredor' | 'Administrador'>('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        activo: doc.data().activo !== false, // Por defecto activo
      } as User));

      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.Rut.includes(searchTerm)
      );
    }

    // Filtrar por rol
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.rol === filterRole);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (user: User) => {
    const confirmMessage = user.activo
      ? `¿Desactivar a ${user.Nombre} ${user.Apellido}? Este usuario no podrá iniciar sesión.`
      : `¿Activar a ${user.Nombre} ${user.Apellido}?`;

    if (!confirm(confirmMessage)) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const newActiveStatus = !user.activo;

      await updateDoc(userRef, {
        activo: newActiveStatus,
      });

      // Registrar en auditoría
      if (userProfile) {
        await logUserToggleActive(
          userProfile.uid,
          userProfile.email,
          `${userProfile.Nombre} ${userProfile.Apellido}`,
          user.uid,
          `${user.Nombre} ${user.Apellido}`,
          newActiveStatus
        );
      }

      // Actualizar estado local
      setUsers(users.map(u =>
        u.uid === user.uid ? { ...u, activo: newActiveStatus } : u
      ));

      alert(`Usuario ${newActiveStatus ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      alert('Error al actualizar el usuario');
    }
  };

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowEditModal(true);
  };

  const handleResetPassword = async (user: User) => {
    if (!confirm(`¿Enviar email de recuperación de contraseña a ${user.email}?`)) return;

    try {
      await sendPasswordResetEmail(auth, user.email);

      // Registrar en auditoría
      if (userProfile) {
        await logPasswordReset(
          userProfile.uid,
          userProfile.email,
          `${userProfile.Nombre} ${userProfile.Apellido}`,
          user.uid,
          user.email
        );
      }

      alert(`Email de recuperación enviado a ${user.email}`);
    } catch (error: any) {
      console.error('Error enviando email:', error);
      alert(`Error: ${error.message || 'No se pudo enviar el email'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">Gestión de Usuarios</h2>
          <p className="text-gray-400">{users.length} usuarios registrados en el sistema</p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          ➕ Crear Nuevo Usuario
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium mb-2">Buscar Usuario</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email, RUT..."
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Filtro por rol */}
          <div>
            <CustomDropdown
              label="Filtrar por Rol"
              value={filterRole}
              onChange={(val) => setFilterRole(val as any)}
              options={[
                { value: 'all', label: 'Todos los Roles' },
                { value: 'Corredor', label: 'Corredor' },
                { value: 'Administrador', label: 'Administrador' }
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </span>
          {(searchTerm || filterRole !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRole('all');
              }}
              className="text-orange-400 hover:text-orange-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {/* Vista Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Usuario</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">RUT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Rol</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Estado</th>
                <th className="px-6 py-4 text-right text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{user.Nombre} {user.Apellido}</div>
                      <div className="text-xs text-gray-500">
                        {user.FechaCreacion?.toDate?.()?.toLocaleDateString?.() || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{user.Rut}</td>
                  <td className="px-6 py-4 text-sm">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.rol === 'Administrador'
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                      : 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                      }`}>
                      {user.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.activo
                      ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                      : 'bg-red-500/20 border border-red-500/50 text-red-400'
                      }`}>
                      {user.activo ? '✓ Activo' : '✕ Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user.uid)}
                        className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all"
                        title="Editar usuario"
                      >
                        <Icons.Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-all"
                        title="Resetear contraseña"
                      >
                        <Icons.Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${user.activo
                          ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30'
                          }`}
                        title={user.activo ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {user.activo ? <Icons.Lock className="w-4 h-4" /> : <Icons.Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile */}
        <div className="lg:hidden divide-y divide-white/10">
          {filteredUsers.map((user) => (
            <div key={user.uid} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{user.Nombre} {user.Apellido}</h3>
                  <p className="text-sm text-gray-400">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{user.Rut}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.rol === 'Administrador'
                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400'
                  : 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                  }`}>
                  {user.rol}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.activo
                  ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                  : 'bg-red-500/20 border border-red-500/50 text-red-400'
                  }`}>
                  {user.activo ? '✓ Activo' : '✕ Inactivo'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditUser(user.uid)}
                    className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded-lg text-xs font-medium"
                  >
                    <Icons.Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg text-xs font-medium"
                  >
                    <Icons.Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${user.activo
                      ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                      : 'bg-green-500/20 border border-green-500/50 text-green-400'
                      }`}
                  >
                    {user.activo ? <Icons.Lock className="w-4 h-4" /> : <Icons.Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No se encontraron usuarios</p>
            <p className="text-sm">Intenta con otros filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Modal de registro */}
      {showRegisterModal && (
        <RegisterModal
          open={showRegisterModal}
          onClose={() => {
            setShowRegisterModal(false);
            loadUsers(); // Recargar usuarios después de crear uno nuevo
          }}
        />
      )}

      {/* Modal de edición */}
      {showEditModal && (
        <EditUserModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          userId={selectedUserId}
          onSuccess={() => {
            loadUsers(); // Recargar usuarios después de editar
          }}
        />
      )}
    </div>
  );
}

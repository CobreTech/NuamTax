"use client";

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import UsersManagement from './components/UsersManagement';
import AuditLogs from './components/AuditLogs';
import SystemStats from './components/SystemStats';
import Charts from './components/Charts';
import BackupManagement from './components/BackupManagement';
import Icons from '../utils/icons';
import { VERSION_INFO } from '../utils/version';
import { logLogout } from '../services/auditService';

type ActiveSection = 'users' | 'audit' | 'system' | 'charts' | 'backup';

/**
 * Dashboard de Administrador
 * 
 * Panel de control exclusivo para usuarios con rol "Administrador"
 * 
 * Funcionalidades:
 * - Gestión de usuarios (crear, editar, desactivar corredores)
 * - Visualización de logs de auditoría del sistema
 * - Estadísticas generales del sistema
 * - NO tiene acceso a calificaciones tributarias (RBAC)
 */
export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<ActiveSection>('system');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (userProfile) {
        await logLogout(
          userProfile.uid,
          userProfile.email,
          `${userProfile.Nombre} ${userProfile.Apellido}`
        )
      }
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const menuItems = [
    { id: 'system' as ActiveSection, label: 'Resumen del Sistema', Icon: Icons.Dashboard },
    { id: 'charts' as ActiveSection, label: 'Gráficos y Análisis', Icon: Icons.BarChart },
    { id: 'users' as ActiveSection, label: 'Gestión de Usuarios', Icon: Icons.Users },
    { id: 'audit' as ActiveSection, label: 'Logs de Auditoría', Icon: Icons.ClipboardList },
    { id: 'backup' as ActiveSection, label: 'Respaldos', Icon: Icons.Database },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950 text-white">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-red-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  Panel de Administración
                </h1>
                <p className="text-xs lg:text-sm text-gray-400">NUAM - Sistema de Gestión</p>
              </div>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold">{userProfile?.Nombre} {userProfile?.Apellido}</p>
                <p className="text-xs text-gray-400">{userProfile?.rol}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all text-sm"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 min-h-[calc(100vh-73px)] backdrop-blur-xl bg-white/5 border-r border-white/10">
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSection === item.id
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg'
                    : 'hover:bg-white/10'
                  }`}
              >
                <item.Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Info del sistema */}
          <div className="absolute bottom-4 left-4 right-4 p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Versión del Sistema</p>
            <p className="text-sm font-semibold">{VERSION_INFO.name} {VERSION_INFO.display}</p>
          </div>
        </aside>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
            <aside
              className="w-64 h-full backdrop-blur-xl bg-slate-950/95 border-r border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="mb-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  ✕ Cerrar
                </button>
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeSection === item.id
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 shadow-lg'
                          : 'hover:bg-white/10'
                        }`}
                    >
                      <item.Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        )}

        {/* Contenido principal */}
        <main className="flex-1 min-h-[calc(100vh-73px)] overflow-y-auto">
          <div className="container mx-auto px-4 lg:px-6 py-6 lg:py-8">
            {/* Renderizar sección activa */}
            {activeSection === 'system' && <SystemStats />}
            {activeSection === 'charts' && <Charts />}
            {activeSection === 'users' && <UsersManagement />}
            {activeSection === 'audit' && <AuditLogs />}
            {activeSection === 'backup' && <BackupManagement />}
          </div>
        </main>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 20s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { UserRole, getDashboardRoute } from '../utils/rbac';

/**
 * Componente HOC para proteger rutas según el rol del usuario
 * Redirige automáticamente si el usuario no tiene permisos
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole; // Rol requerido para acceder (opcional)
  requireAuth?: boolean; // Requiere estar autenticado (default: true)
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requireAuth = true,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Esperar a que cargue el perfil

    // Si requiere autenticación y no hay usuario, redirigir al login
    if (requireAuth && !user) {
      console.log('[PROTECTED ROUTE] No autenticado, redirigiendo a /login');
      router.push('/login');
      return;
    }

    // Si hay usuario pero no hay perfil, error
    if (user && !userProfile) {
      console.error('[PROTECTED ROUTE ERROR] Usuario sin perfil en Firestore');
      router.push('/login');
      return;
    }

    // Si se requiere un rol específico y el usuario no lo tiene
    if (requiredRole && userProfile && userProfile.rol !== requiredRole) {
      console.log(`[PROTECTED ROUTE] Rol incorrecto (${userProfile.rol}), redirigiendo a dashboard correcto`);
      const correctRoute = getDashboardRoute(userProfile.rol);
      router.push(correctRoute);
      return;
    }

    // Usuario autorizado, permitir acceso
    console.log('[PROTECTED ROUTE] Acceso autorizado:', userProfile?.rol);
  }, [user, userProfile, loading, requireAuth, requiredRole, router]);

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-orange-950 to-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-white text-lg">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado y requiere auth, no mostrar nada (está redirigiendo)
  if (requireAuth && !user) {
    return null;
  }

  // Si el rol no coincide, no mostrar nada (está redirigiendo)
  if (requiredRole && userProfile && userProfile.rol !== requiredRole) {
    return null;
  }

  // Usuario autorizado, renderizar contenido
  return <>{children}</>;
}

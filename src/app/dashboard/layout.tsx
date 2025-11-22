/**
 * Layout del Dashboard de Corredor
 * Protege todas las rutas /dashboard/* para que solo accedan usuarios con rol "Corredor"
 */
'use client';

import ProtectedRoute from '../components/ProtectedRoute';
import { DashboardProvider } from '../context/DashboardContext';
import GeminiAssistant from '../components/GeminiAssistant';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="Corredor">
      <DashboardProvider>
        {children}
        <GeminiAssistant />
      </DashboardProvider>
    </ProtectedRoute>
  );
}

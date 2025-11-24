"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import Icons from '@/app/utils/icons';
import CustomDropdown from '@/app/components/CustomDropdown';

interface AuditLog {
  id: string;
  timestamp: Date;
  usuarioId: string; // Changed from userId
  userEmail: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  metadata?: any;
}

/**
 * Componente de Logs de Auditoría
 * 
 * Permite a los administradores:
 * - Ver todos los logs del sistema
 * - Filtrar por usuario, acción, recurso, fecha
 * - Exportar logs a CSV
 * - Ver detalles completos de cada evento
 */
export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterAction, filterResource]);

  const loadLogs = async () => {
    try {
      setLoading(true);

      // Intentar cargar logs de auditoría
      const logsQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const logsSnap = await getDocs(logsQuery);
      const logsData = logsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          usuarioId: data.usuarioId || data.userId, // Backward compatibility
          timestamp: data.timestamp?.toDate() || new Date(),
        } as AuditLog;
      });

      setLogs(logsData);
    } catch (error) {
      console.error('Error cargando logs:', error);
      // Si no existen logs aún, mostrar logs de ejemplo
      setLogs(generateSampleLogs());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleLogs = (): AuditLog[] => {
    const now = new Date();
    return [
      {
        id: '1',
        timestamp: new Date(now.getTime() - 3600000),
        usuarioId: 'user-123',
        userEmail: 'corredor@nuam.com',
        userName: 'Juan Pérez',
        action: 'LOGIN',
        resource: 'system',
        details: 'Inicio de sesión exitoso',
      },
      {
        id: '2',
        timestamp: new Date(now.getTime() - 7200000),
        usuarioId: 'user-123',
        userEmail: 'corredor@nuam.com',
        userName: 'Juan Pérez',
        action: 'UPLOAD',
        resource: 'qualification',
        details: 'Carga masiva de 150 calificaciones',
        metadata: { count: 150 },
      },
      {
        id: '3',
        timestamp: new Date(now.getTime() - 10800000),
        usuarioId: 'admin-456',
        userEmail: 'admin@nuam.com',
        userName: 'María González',
        action: 'CREATE',
        resource: 'user',
        resourceId: 'user-789',
        details: 'Nuevo usuario creado: Pedro López',
      },
    ];
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por acción
    if (filterAction !== 'all') {
      filtered = filtered.filter(log => log.action === filterAction);
    }

    // Filtrar por recurso
    if (filterResource !== 'all') {
      filtered = filtered.filter(log => log.resource === filterResource);
    }

    setFilteredLogs(filtered);
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Recurso', 'Detalles'];
    const rows = filteredLogs.map(log => [
      log.timestamp.toLocaleString(),
      log.userName,
      log.userEmail,
      log.action,
      log.resource,
      log.details,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      'LOGIN': Icons.Login,
      'LOGOUT': Icons.Logout,
      'CREATE': Icons.Add,
      'UPDATE': Icons.Edit,
      'DELETE': Icons.Delete,
      'UPLOAD': Icons.Upload,
      'PASSWORD_RESET': Icons.Key,
    };
    return icons[action] || Icons.ClipboardList;
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      'LOGIN': 'text-green-400',
      'LOGOUT': 'text-gray-400',
      'CREATE': 'text-blue-400',
      'UPDATE': 'text-amber-400',
      'DELETE': 'text-red-400',
      'UPLOAD': 'text-purple-400',
    };
    return colors[action] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
          <p className="text-gray-400">Cargando logs de auditoría...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">Logs de Auditoría</h2>
          <p className="text-gray-400">{logs.length} eventos registrados en el sistema</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <Icons.Download className="w-4 h-4 inline mr-2" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="relative z-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Usuario, email, detalles..."
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <CustomDropdown
              label="Acción"
              value={filterAction}
              onChange={(val) => setFilterAction(val as string)}
              options={[
                { value: "all", label: "Todas las Acciones" },
                { value: "LOGIN", label: "Login" },
                { value: "LOGOUT", label: "Logout" },
                { value: "CREATE", label: "Crear" },
                { value: "UPDATE", label: "Actualizar" },
                { value: "DELETE", label: "Eliminar" },
                { value: "UPLOAD", label: "Carga Masiva" },
              ]}
            />
          </div>

          <div>
            <CustomDropdown
              label="Recurso"
              value={filterResource}
              onChange={(val) => setFilterResource(val as string)}
              options={[
                { value: "all", label: "Todos los Recursos" },
                { value: "system", label: "Sistema" },
                { value: "user", label: "Usuario" },
                { value: "qualification", label: "Calificación" },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Mostrando {filteredLogs.length} de {logs.length} eventos
          </span>
          {(searchTerm || filterAction !== 'all' || filterResource !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterAction('all');
                setFilterResource('all');
              }}
              className="text-orange-400 hover:text-orange-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold">Fecha/Hora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Recurso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-xs">
                    <div>{log.timestamp.toLocaleDateString()}</div>
                    <div className="text-gray-500">{log.timestamp.toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="font-medium">{log.userName}</div>
                    <div className="text-gray-500">{log.userEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-medium ${getActionColor(log.action)}`}>
                      {(() => {
                        const ActionIcon = getActionIcon(log.action);
                        return <ActionIcon className="w-4 h-4" />;
                      })()}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{log.resource}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No se encontraron logs</p>
            <p className="text-sm">Intenta con otros filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
          <div className="relative w-full max-w-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
              <button
                onClick={() => setSelectedLog(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-2xl font-bold mb-6">Detalles del Evento</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Fecha y Hora</label>
                  <p className="text-lg">{selectedLog.timestamp.toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Usuario</label>
                  <p className="text-lg">{selectedLog.userName}</p>
                  <p className="text-sm text-gray-500">{selectedLog.userEmail}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Acción</label>
                  <p className="text-lg flex items-center gap-2">
                    {(() => {
                      const ActionIcon = getActionIcon(selectedLog.action);
                      return <ActionIcon className="w-5 h-5" />;
                    })()}
                    {selectedLog.action}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-400">Recurso</label>
                  <p className="text-lg">{selectedLog.resource}</p>
                  {selectedLog.resourceId && (
                    <p className="text-sm text-gray-500">ID: {selectedLog.resourceId}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-400">Detalles</label>
                  <p className="text-lg">{selectedLog.details}</p>
                </div>

                {selectedLog.metadata && (
                  <div>
                    <label className="text-sm text-gray-400">Metadata</label>
                    <pre className="mt-2 p-4 bg-black/30 rounded-xl text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

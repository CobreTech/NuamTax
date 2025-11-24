/**
 * Servicio de Auditoría del Sistema
 * 
 * Registra automáticamente todos los eventos importantes del sistema para cumplir
 * con requisitos de trazabilidad y seguridad. Incluye creación, actualización y
 * eliminación de calificaciones, exportación de reportes, cargas masivas y cambios
 * de configuración. Todos los eventos incluyen timestamp, usuario, acción y detalles relevantes.
 */

import { collection, addDoc, Timestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Tipos de acciones auditables
 */
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'UPLOAD'
  | 'EXPORT'
  | 'PASSWORD_RESET';

/**
 * Tipos de recursos auditables
 */
export type AuditResource =
  | 'system'
  | 'user'
  | 'qualification'
  | 'report';

/**
 * Interface para un log de auditoría
 */
export interface AuditLog {
  timestamp: Date;
  usuarioId: string; // Changed from userId to match Firestore rules
  userEmail: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Registra un evento de auditoría en Firestore
 * 
 * @param log - Objeto con la información del evento
 * @returns Promise<string> - ID del documento creado
 */
export async function logAuditEvent(log: AuditLog): Promise<string> {
  try {
    // Sanitize log data to remove undefined values but preserve Timestamp
    const cleanLog = JSON.parse(JSON.stringify({
      ...log,
      // Temporarily remove timestamp to avoid stringification
      timestamp: null
    }));

    // Restore the proper Timestamp object
    const sanitizedLog = {
      ...cleanLog,
      timestamp: Timestamp.fromDate(log.timestamp)
    };

    const docRef = await addDoc(collection(db, 'auditLogs'), sanitizedLog);

    console.log('[AUDIT] Log registered:', {
      action: log.action,
      resource: log.resource,
      user: log.userEmail,
    });

    return docRef.id;
  } catch (error) {
    console.error('[AUDIT ERROR] Error registrando audit log:', error);
    // No lanzar error para no interrumpir el flujo principal
    return '';
  }
}

/**
 * Registra un evento de login
 */
export async function logLogin(userId: string, userEmail: string, userName: string) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'LOGIN',
    resource: 'system',
    details: 'Inicio de sesión exitoso',
  });
}

/**
 * Registra un evento de logout
 */
export async function logLogout(userId: string, userEmail: string, userName: string) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'LOGOUT',
    resource: 'system',
    details: 'Cierre de sesión',
  });
}

/**
 * Registra la creación de un usuario
 */
export async function logUserCreated(
  adminId: string,
  adminEmail: string,
  adminName: string,
  newUserId: string,
  newUserData: { nombre: string; apellido: string; email: string; rol: string }
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: adminId,
    userEmail: adminEmail,
    userName: adminName,
    action: 'CREATE',
    resource: 'user',
    resourceId: newUserId,
    details: `Nuevo usuario creado: ${newUserData.nombre} ${newUserData.apellido} (${newUserData.rol})`,
    changes: {
      after: newUserData,
    },
  });
}

/**
 * Registra la actualización de un usuario
 */
export async function logUserUpdated(
  adminId: string,
  adminEmail: string,
  adminName: string,
  targetUserId: string,
  before: any,
  after: any
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: adminId,
    userEmail: adminEmail,
    userName: adminName,
    action: 'UPDATE',
    resource: 'user',
    resourceId: targetUserId,
    details: `Usuario actualizado: ${after.Nombre} ${after.Apellido}`,
    changes: {
      before,
      after,
    },
  });
}

/**
 * Registra la desactivación/activación de un usuario
 */
export async function logUserToggleActive(
  adminId: string,
  adminEmail: string,
  adminName: string,
  targetUserId: string,
  targetUserName: string,
  isActive: boolean
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: adminId,
    userEmail: adminEmail,
    userName: adminName,
    action: 'UPDATE',
    resource: 'user',
    resourceId: targetUserId,
    details: `Usuario ${isActive ? 'activado' : 'desactivado'}: ${targetUserName}`,
    metadata: {
      activo: isActive,
    },
  });
}

/**
 * Registra el reseteo de contraseña
 */
export async function logPasswordReset(
  adminId: string,
  adminEmail: string,
  adminName: string,
  targetUserId: string,
  targetUserEmail: string
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: adminId,
    userEmail: adminEmail,
    userName: adminName,
    action: 'PASSWORD_RESET',
    resource: 'user',
    resourceId: targetUserId,
    details: `Contraseña restablecida para: ${targetUserEmail}`,
  });
}

/**
 * Registra una carga masiva de calificaciones
 */
export async function logBulkUpload(
  userId: string,
  userEmail: string,
  userName: string,
  recordCount: number,
  successCount: number,
  errorCount: number
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'UPLOAD',
    resource: 'qualification',
    details: `Carga masiva: ${successCount} exitosos, ${errorCount} errores de ${recordCount} total`,
    metadata: {
      totalRecords: recordCount,
      successCount,
      errorCount,
    },
  });
}

/**
 * Registra la creación de una calificación
 */
export async function logQualificationCreated(
  userId: string,
  userEmail: string,
  userName: string,
  qualificationId: string,
  qualificationData: any
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'CREATE',
    resource: 'qualification',
    resourceId: qualificationId,
    details: `Calificación creada: ${qualificationData.tipoInstrumento || qualificationData.instrument || 'N/A'}`,
    changes: {
      after: qualificationData,
    },
  });
}

/**
 * Registra la actualización de una calificación
 */
export async function logQualificationUpdated(
  userId: string,
  userEmail: string,
  userName: string,
  qualificationId: string,
  before: any,
  after: any
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'UPDATE',
    resource: 'qualification',
    resourceId: qualificationId,
    details: `Calificación actualizada: ${after.tipoInstrumento || after.instrument || 'N/A'}`,
    changes: {
      before,
      after,
    },
  });
}

/**
 * Registra la eliminación de una calificación
 */
export async function logQualificationDeleted(
  userId: string,
  userEmail: string,
  userName: string,
  qualificationId: string,
  qualificationData: any
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'DELETE',
    resource: 'qualification',
    resourceId: qualificationId,
    details: `Calificación eliminada: ${qualificationData.tipoInstrumento || qualificationData.instrument || 'N/A'}`,
    changes: {
      before: qualificationData,
    },
  });
}

/**
 * Registra la exportación de datos
 */
export async function logDataExport(
  userId: string,
  userEmail: string,
  userName: string,
  exportType: string,
  recordCount: number
) {
  return logAuditEvent({
    timestamp: new Date(),
    usuarioId: userId,
    userEmail,
    userName,
    action: 'EXPORT',
    resource: 'report',
    details: `Exportación de ${exportType}: ${recordCount} registros`,
    metadata: {
      exportType,
      recordCount,
    },
  });
}

/**
 * Obtiene la actividad reciente de un usuario
 * Para mostrar en el OverviewSection
 */
export interface RecentActivityItem {
  id: string;
  action: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

export async function getRecentActivity(
  userId: string,
  limitCount: number = 4
): Promise<RecentActivityItem[]> {
  try {
    if (!userId) {
      return [];
    }

    console.log('[getRecentActivity] Fetching activity for user:', userId);
    let querySnapshot;

    try {
      // Intentar consulta con índice compuesto
      const q = query(
        collection(db, 'auditLogs'),
        where('usuarioId', '==', userId), // Changed to usuarioId
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      querySnapshot = await getDocs(q);
      console.log('[getRecentActivity] Main query success, docs:', querySnapshot.size);
    } catch (error: any) {
      console.warn('[getRecentActivity] Main query failed:', error.code, error.message);
      // Si falla por falta de índice, intentar sin orderBy y ordenar manualmente
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('[getRecentActivity] Índice no disponible, consultando sin orderBy...', error);
        const q = query(
          collection(db, 'auditLogs'),
          where('usuarioId', '==', userId), // Changed to usuarioId
          limit(300) // Aumentar límite para asegurar que los logs recientes estén incluidos (sin índice no podemos garantizar orden)
        );
        querySnapshot = await getDocs(q);
        console.log('[getRecentActivity] Fallback query success, docs:', querySnapshot.size);
      } else {
        throw error;
      }
    }

    const activities: RecentActivityItem[] = [];

    const docsWithTimestamps = querySnapshot.docs.map(doc => {
      const data = doc.data();
      let timestamp: Date | null = null;

      try {
        if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp) {
          const parsed = new Date(data.timestamp);
          if (!isNaN(parsed.getTime())) {
            timestamp = parsed;
          }
        }
      } catch (e) {
        console.warn('Error parsing timestamp for log:', doc.id, e);
      }

      return {
        doc,
        timestamp,
        data,
      };
    });

    // Filtrar logs sin timestamp válido
    const validDocs = docsWithTimestamps.filter(d => d.timestamp !== null) as { doc: any, timestamp: Date, data: any }[];

    // Ordenar por timestamp descendente (si no se usó orderBy en la consulta)
    validDocs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Tomar solo los primeros limitCount
    validDocs.slice(0, limitCount).forEach(({ doc, timestamp, data }) => {
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let timeString = '';
      if (diffMins < 1) {
        timeString = 'Hace unos momentos';
      } else if (diffMins < 60) {
        timeString = `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      } else if (diffHours < 24) {
        timeString = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
      } else {
        timeString = `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
      }

      // Determinar status basado en la acción
      let status: 'success' | 'warning' | 'error' = 'success';
      if (data.action === 'DELETE' || data.action === 'LOGOUT') {
        status = 'warning';
      } else if (data.metadata?.errorCount > 0) {
        status = 'error';
      }

      activities.push({
        id: doc.id,
        action: data.details || `${data.action} en ${data.resource}`,
        time: timeString,
        status,
      });
    });

    return activities;
  } catch (error) {
    console.error('[getRecentActivity] Error obteniendo actividad reciente:', error);
    return [];
  }
}

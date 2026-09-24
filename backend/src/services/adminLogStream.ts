import { Server as SocketIOServer } from 'socket.io';
import { IncidentModel } from '../models/Incident.js';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  category: 'CRON_WORKER' | 'HEALTH_CHECK' | 'INCIDENT' | 'AUTH' | 'CACHE_REDIS' | 'SYSTEM';
  message: string;
  details?: any;
}

let ioInstance: SocketIOServer | null = null;

export function setSocketIOInstance(io: SocketIOServer) {
  ioInstance = io;
}

export function emitSystemLog(
  category: SystemLogEntry['category'],
  message: string,
  level: SystemLogEntry['level'] = 'info',
  details?: any
) {
  // Always log to standard console
  const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${icon} [${category}]: ${message}`);

  // ZERO OVERHEAD GUARD: If no Socket.IO instance or no connected admin clients, return immediately
  if (!ioInstance || ioInstance.sockets.sockets.size === 0) {
    return;
  }

  const entry: SystemLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details,
  };

  // Broadcast only to active socket connections
  ioInstance.emit('admin:log-stream', entry);
}

/**
 * On-demand log history generator querying database incidents cleanly without maintaining memory buffers
 */
export async function getSystemLogHistory(): Promise<SystemLogEntry[]> {
  try {
    const recentIncidents = await IncidentModel.find()
      .populate('endpointId', 'projectName url')
      .sort({ startedAt: -1 })
      .limit(30)
      .lean();

    const logs: SystemLogEntry[] = recentIncidents.map((inc) => {
      const epName = (inc.endpointId as any)?.projectName || 'Monitored Service';
      return {
        id: inc._id.toString(),
        timestamp: (inc.startedAt || new Date()).toISOString(),
        level: inc.resolved ? 'success' : 'error',
        category: 'INCIDENT',
        message: inc.resolved
          ? `[RESOLVED] Incident on "${epName}": ${inc.errorMessage || 'Service operating normally'}`
          : `[ACTIVE INCIDENT] "${epName}" triggered alert: ${inc.errorMessage || 'Service unavailable'} (HTTP ${inc.statusCode || 500})`,
        details: { endpointId: inc.endpointId, resolved: inc.resolved },
      };
    });

    return logs;
  } catch (err) {
    return [];
  }
}


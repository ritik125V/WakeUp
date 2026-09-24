import { popDueEndpoints } from './redisScheduler.js';
import { executeBatch } from './executionEngine.js';
import { SYSTEM_CONFIG } from '../config/systemConfig.js';
import { isRedisAvailable } from '../config/redis.js';
import { emitSystemLog } from './adminLogStream.js';

let workerIntervalHandle: NodeJS.Timeout | null = null;

/**
 * Main worker loop popping due endpoints from Redis/MongoDB and executing health checks
 */
export async function runMonitoringCycle(): Promise<void> {
  try {
    const dueEndpointIds = await popDueEndpoints(SYSTEM_CONFIG.DEFAULT_BATCH_SIZE);
    if (dueEndpointIds.length > 0) {
      const mode = isRedisAvailable() ? 'Redis' : 'MongoDB Fallback';
      const msg = `Popped ${dueEndpointIds.length} due endpoint(s) for health check batch execution via ${mode}.`;
      emitSystemLog('CRON_WORKER', msg, 'info', { count: dueEndpointIds.length, mode });
      await executeBatch(dueEndpointIds);
    }
  } catch (error) {
    emitSystemLog('CRON_WORKER', `Error during monitoring cycle: ${error}`, 'error');
  }
}

/**
 * Starts the background monitoring ticker
 */
export function startMonitoringWorker(intervalMs: number = 10000): void {
  if (workerIntervalHandle) return;

  const mode = isRedisAvailable() ? 'High-Performance Redis Mode' : 'MongoDB Resilient Fallback Mode';
  emitSystemLog('CRON_WORKER', `Monitoring ticker active (${mode}, ${intervalMs}ms cycle).`, 'success');
  
  // Run an initial cycle immediately
  runMonitoringCycle();

  workerIntervalHandle = setInterval(() => {
    runMonitoringCycle();
  }, intervalMs);
}

/**
 * Stops the background monitoring ticker
 */
export function stopMonitoringWorker(): void {
  if (workerIntervalHandle) {
    clearInterval(workerIntervalHandle);
    workerIntervalHandle = null;
    console.log('🛑 [Worker]: Monitoring worker stopped.');
  }
}


import http from 'http';
import https from 'https';
import axios from 'axios';
import { EndpointModel, IEndpoint } from '../models/Endpoint.js';
import { IncidentModel, IIncident } from '../models/Incident.js';
import { getRedisClient, isRedisAvailable } from '../config/redis.js';
import { SYSTEM_CONFIG } from '../config/systemConfig.js';
import { reQueueEndpoint } from './redisScheduler.js';

// Tuned HTTP / HTTPS keep-alive agents for high concurrency and resource management
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: SYSTEM_CONFIG.HTTP_TIMEOUT_MS,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: SYSTEM_CONFIG.HTTP_TIMEOUT_MS,
});

const axiosClient = axios.create({
  httpAgent,
  httpsAgent,
  timeout: SYSTEM_CONFIG.HTTP_TIMEOUT_MS,
  validateStatus: () => true, // Handle all status codes manually
});

export type ApiHealthClassification = 'healthy' | 'degraded' | 'down';

export interface ClassificationRuleResult {
  classification: ApiHealthClassification;
  isSuccess: boolean;
  statusCode: number;
  responseTimeMs: number;
  errorMessage?: string;
  errorType?: 'HTTP_ERROR' | 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_STATUS';
  responseSnippet?: string;
}

/**
 * CENTRAL BACKEND OPERATIONAL RULE CLASSIFIER
 * 
 * Rules:
 * 1. HEALTHY: Status code matches expectedStatusCode AND response time <= 1000ms.
 * 2. DEGRADED: Status code matches expectedStatusCode BUT response time > 1000ms (slow latency).
 * 3. DOWN: Status code mismatch, 5xx/4xx error, timeout, or network failure.
 */
export function classifyApiHealth(
  responseStatus: number,
  responseTimeMs: number,
  expectedStatusCode: number = 200,
  responseData?: unknown
): ClassificationRuleResult {
  const expectedCode = expectedStatusCode || 200;

  // Status code matching check
  const isStatusMatched = expectedCode !== 200
    ? responseStatus === expectedCode
    : (responseStatus >= 200 && responseStatus < 300);

  if (!isStatusMatched) {
    let snippet = '';
    if (responseData) {
      const dataStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
      snippet = dataStr.slice(0, SYSTEM_CONFIG.MAX_RESPONSE_SNIPPET_BYTES);
    }

    return {
      classification: 'down',
      isSuccess: false,
      statusCode: responseStatus,
      responseTimeMs,
      errorType: responseStatus >= 500 ? 'HTTP_ERROR' : 'INVALID_STATUS',
      errorMessage: `Received HTTP ${responseStatus} (Expected HTTP ${expectedCode})`,
      responseSnippet: snippet,
    };
  }

  // Response time latency check for DEGRADED state
  if (responseTimeMs > 1000) {
    return {
      classification: 'degraded',
      isSuccess: true, // Status matched, but degraded performance
      statusCode: responseStatus,
      responseTimeMs,
      errorMessage: `Slow API response time (${responseTimeMs}ms > 1000ms SLA threshold)`,
    };
  }

  return {
    classification: 'healthy',
    isSuccess: true,
    statusCode: responseStatus,
    responseTimeMs,
  };
}

/**
 * Perform a single URL health check
 */
export async function performHealthCheck(endpoint: IEndpoint): Promise<ClassificationRuleResult> {
  const startTime = Date.now();
  try {
    const response = await axiosClient.request({
      url: endpoint.url,
      method: endpoint.method || 'GET',
      headers: endpoint.headers || {},
    });

    const responseTimeMs = Date.now() - startTime;
    return classifyApiHealth(
      response.status,
      responseTimeMs,
      endpoint.expectedStatusCode || 200,
      response.data
    );
  } catch (error: unknown) {
    const responseTimeMs = Date.now() - startTime;
    let errorMessage = 'Network check failed';
    let errorType: 'TIMEOUT' | 'NETWORK_ERROR' = 'NETWORK_ERROR';

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorType = 'TIMEOUT';
        errorMessage = `Request timed out after ${SYSTEM_CONFIG.HTTP_TIMEOUT_MS}ms`;
      } else {
        errorMessage = error.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      classification: 'down',
      isSuccess: false,
      statusCode: 0,
      responseTimeMs,
      errorType,
      errorMessage,
    };
  }
}

/**
 * Helper to get active incident using Redis cache or MongoDB fallback.
 */
async function findActiveIncident(endpointId: string): Promise<IIncident | null> {
  const redisKey = `${SYSTEM_CONFIG.REDIS_ACTIVE_INCIDENT_PREFIX}${endpointId}`;
  
  if (isRedisAvailable()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const activeIncidentId = await redis.get(redisKey);
        if (activeIncidentId) {
          const incident = await IncidentModel.findById(activeIncidentId);
          if (incident && !incident.resolved) {
            return incident;
          }
        }
      } catch (err) {
        console.warn(`⚠️ [ExecutionEngine]: Redis incident lookup failed, using MongoDB fallback:`, err);
      }
    }
  }

  // Fallback: Query MongoDB index for open incident on this endpoint
  return IncidentModel.findOne({ endpointId, resolved: false });
}

/**
 * Processes health check result & applies classification rules to MongoDB and Redis
 */
export async function processCheckResult(endpoint: IEndpoint, result: ClassificationRuleResult): Promise<void> {
  const redisKey = `${SYSTEM_CONFIG.REDIS_ACTIVE_INCIDENT_PREFIX}${endpoint._id}`;
  const now = new Date();

  if (result.classification === 'healthy' || result.classification === 'degraded') {
    // Resolve any active incident
    const incident = await findActiveIncident(endpoint._id.toString());
    if (incident && !incident.resolved) {
      incident.resolved = true;
      incident.resolvedAt = now;
      incident.durationSeconds = Math.round((now.getTime() - incident.startedAt.getTime()) / 1000);
      await incident.save();
    }

    if (isRedisAvailable()) {
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.del(redisKey);
        } catch {
          // Ignore cache eviction failure
        }
      }
    }

    await EndpointModel.findByIdAndUpdate(endpoint._id, {
      status: result.classification,
      lastCheckedAt: now,
      lastResponseTimeMs: result.responseTimeMs,
      lastStatusCode: result.statusCode,
    });
  } else {
    // DOWN / INCIDENT
    let incident = await findActiveIncident(endpoint._id.toString());

    if (incident && !incident.resolved) {
      incident.lastSeenAt = now;
      incident.durationSeconds = Math.round((now.getTime() - incident.startedAt.getTime()) / 1000);
      incident.responseTimeMs = result.responseTimeMs;
      await incident.save();
    } else {
      incident = await IncidentModel.create({
        endpointId: endpoint._id,
        userId: endpoint.userId,
        projectName: endpoint.projectName,
        url: endpoint.url,
        errorType: result.errorType || 'INVALID_STATUS',
        statusCode: result.statusCode,
        errorMessage: result.errorMessage || 'Health check failed backend operational rules',
        responseTimeMs: result.responseTimeMs,
        responseSnippet: result.responseSnippet,
        startedAt: now,
        lastSeenAt: now,
        durationSeconds: 0,
        resolved: false,
      });
    }

    if (isRedisAvailable() && incident) {
      const redis = getRedisClient();
      if (redis) {
        try {
          await redis.set(redisKey, incident._id.toString(), 'EX', SYSTEM_CONFIG.REDIS_CACHE_TTL_SECONDS);
        } catch {
          // Ignore cache set error
        }
      }
    }

    await EndpointModel.findByIdAndUpdate(endpoint._id, {
      status: 'down',
      lastCheckedAt: now,
      lastResponseTimeMs: result.responseTimeMs,
      lastStatusCode: result.statusCode,
    });
  }
}

/**
 * Execute batch in parallel
 */
export async function executeBatch(endpointIds: string[]): Promise<void> {
  if (endpointIds.length === 0) return;

  // Use lean selection for optimal space complexity
  const endpoints = await EndpointModel.find({ _id: { $in: endpointIds } }).select(
    '_id url method headers expectedStatusCode checkIntervalMinutes userId projectName'
  );

  await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      try {
        const result = await performHealthCheck(endpoint);
        await processCheckResult(endpoint, result);
      } catch (err) {
        console.error(`Error executing check for ${endpoint.url}:`, err);
      } finally {
        await reQueueEndpoint(endpoint._id.toString(), endpoint.checkIntervalMinutes);
      }
    })
  );
}


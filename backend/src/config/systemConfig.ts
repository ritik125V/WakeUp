export const SYSTEM_CONFIG = {
  // Batch Execution Settings
  DEFAULT_BATCH_SIZE: 50, // 50 to 100 endpoints per batch chunk
  MIN_BATCH_SIZE: 10,
  MAX_BATCH_SIZE: 200,

  // Cron & Schedule Intervals (in minutes)
  DEFAULT_CHECK_INTERVAL_MINUTES: 5,
  ALLOWED_INTERVALS_MINUTES: [5, 10, 15],

  // HTTP Request Settings
  HTTP_TIMEOUT_MS: 5000, // 5-second strict timeout for health checks
  MAX_RESPONSE_SNIPPET_BYTES: 1024, // Read maximum 1KB for incident error logs

  // Redis Keys & TTL
  REDIS_SCHEDULE_ZSET: 'wakeup:monitor_schedule',
  REDIS_ACTIVE_INCIDENT_PREFIX: 'wakeup:incident:',
  REDIS_ENDPOINT_CACHE_PREFIX: 'wakeup:endpoint:',
  REDIS_CACHE_TTL_SECONDS: 86400, // 24 hours

  // Retention & History
  MAX_INCIDENT_HISTORY_DAYS: 30,
};

export type CheckInterval = 5 | 10 | 15;

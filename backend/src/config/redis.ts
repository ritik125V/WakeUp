import Redis from 'ioredis';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('⚠️ [Redis]: REDIS_URL is not defined in environment variables. Falling back to MongoDB mode.');
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1, // Fail fast so caller falls back quickly
      enableOfflineQueue: false, // Don't buffer commands when offline
      retryStrategy(times) {
        // Exponential backoff capped at 30s
        return Math.min(times * 200, 30000);
      },
    });

    redisClient.on('connect', () => {
      console.log('✅ [Redis]: Connected successfully to Redis.');
    });

    redisClient.on('ready', () => {
      console.log('⚡ [Redis]: Redis client is ready to accept commands.');
    });

    redisClient.on('error', (err) => {
      console.error('❌ [Redis]: Connection error:', err.message);
    });

    return redisClient;
  } catch (error) {
    console.error('❌ [Redis]: Initialization error:', error);
    return null;
  }
};

/**
 * Returns true only if Redis is configured, initialized, and currently in 'ready' state.
 */
export const isRedisAvailable = (): boolean => {
  return Boolean(redisClient && redisClient.status === 'ready');
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  if (client && client.status === 'wait') {
    try {
      await client.connect();
    } catch (error) {
      console.error('❌ [Redis]: Initial connection failed (will fallback to MongoDB):', error);
    }
  }
};


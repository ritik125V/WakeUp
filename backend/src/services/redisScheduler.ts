import { getRedisClient, isRedisAvailable } from '../config/redis.js';
import { SYSTEM_CONFIG } from '../config/systemConfig.js';
import { EndpointModel } from '../models/Endpoint.js';

// Lua script for atomic fetch-and-remove from Redis Sorted Set (ZSET)
const ATOMIC_POP_LUA_SCRIPT = `
  local due = redis.call('ZRANGEBYSCORE', KEYS[1], 0, ARGV[1], 'LIMIT', 0, ARGV[2])
  if #due > 0 then
    redis.call('ZREM', KEYS[1], unpack(due))
  end
  return due
`;

/**
 * Assigns an endpoint to a batch identifier based on target interval & batch capacity.
 */
export async function assignBatch(
  endpointId: string,
  intervalMinutes: number = SYSTEM_CONFIG.DEFAULT_CHECK_INTERVAL_MINUTES,
  maxBatchSize: number = SYSTEM_CONFIG.DEFAULT_BATCH_SIZE
): Promise<string> {
  let batchIndex = 1;
  let batchId = `batch:${intervalMinutes}m:${batchIndex}`;

  if (isRedisAvailable()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        while (true) {
          batchId = `batch:${intervalMinutes}m:${batchIndex}`;
          const countKey = `wakeup:batch_count:${batchId}`;
          const currentSize = await redis.incr(countKey);

          if (currentSize <= maxBatchSize) {
            break; // Successfully assigned to this batch
          } else {
            await redis.decr(countKey);
            batchIndex++;
          }
        }
      } catch (err) {
        console.warn('⚠️ [Scheduler]: Redis batch assignment failed, falling back to MongoDB count:', err);
        batchId = `batch:${intervalMinutes}m:1`;
      }
    }
  } else {
    // Fallback: Query MongoDB count for batch assignment
    try {
      while (true) {
        batchId = `batch:${intervalMinutes}m:${batchIndex}`;
        const currentSize = await EndpointModel.countDocuments({ batchId });
        if (currentSize < maxBatchSize) {
          break;
        }
        batchIndex++;
      }
    } catch {
      batchId = `batch:${intervalMinutes}m:1`;
    }
  }

  // Update batchId & interval on MongoDB endpoint document
  await EndpointModel.findByIdAndUpdate(endpointId, {
    batchId,
    checkIntervalMinutes: intervalMinutes,
  });

  // Schedule initial run (immediately)
  await scheduleEndpointInRedis(endpointId, 0);

  return batchId;
}

/**
 * Schedules an endpoint in Redis ZSET (if available) AND MongoDB nextCheckAt field.
 */
export async function scheduleEndpointInRedis(
  endpointId: string,
  delayMs: number = 0
): Promise<void> {
  const nextRunTimeMs = Date.now() + delayMs;
  const nextCheckAtDate = new Date(nextRunTimeMs);

  // 1. Always update MongoDB nextCheckAt for robust fallback capability
  try {
    await EndpointModel.findByIdAndUpdate(endpointId, {
      nextCheckAt: nextCheckAtDate,
    });
  } catch (err) {
    console.error(`❌ [Scheduler]: Failed to set nextCheckAt on endpoint ${endpointId}:`, err);
  }

  // 2. If Redis is available, schedule in Redis ZSET for high performance
  if (isRedisAvailable()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.zadd(SYSTEM_CONFIG.REDIS_SCHEDULE_ZSET, nextRunTimeMs.toString(), endpointId);
      } catch (err) {
        console.warn(`⚠️ [Scheduler]: Redis zadd failed for endpoint ${endpointId}:`, err);
      }
    }
  }
}

/**
 * Pops due endpoint IDs.
 * - Uses atomic Lua script in Redis if available.
 * - Falls back to MongoDB index lookup if Redis is absent/down.
 */
export async function popDueEndpoints(maxLimit: number = 100): Promise<string[]> {
  const nowMs = Date.now();

  // HIGH-PERFORMANCE REDIS PATH (Atomic Lua Script)
  if (isRedisAvailable()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const dueEndpointIds = (await redis.eval(
          ATOMIC_POP_LUA_SCRIPT,
          1,
          SYSTEM_CONFIG.REDIS_SCHEDULE_ZSET,
          nowMs.toString(),
          maxLimit.toString()
        )) as string[];

        if (Array.isArray(dueEndpointIds) && dueEndpointIds.length > 0) {
          return dueEndpointIds;
        }
      } catch (err) {
        console.warn('⚠️ [Scheduler]: Atomic Redis pop failed, switching to MongoDB fallback query:', err);
      }
    }
  }

  // MONGODB FALLBACK PATH
  try {
    const nowDate = new Date(nowMs);
    // Find endpoints due for check (nextCheckAt <= now or missing nextCheckAt)
    const dueEndpoints = await EndpointModel.find({
      $or: [
        { nextCheckAt: { $lte: nowDate } },
        { nextCheckAt: { $exists: false } },
      ],
    })
      .select('_id checkIntervalMinutes')
      .limit(maxLimit)
      .lean();

    if (dueEndpoints.length === 0) return [];

    const dueIds = dueEndpoints.map((ep) => ep._id.toString());
    const tempLockDate = new Date(nowMs + 60000); // 60s temporary lock while processing

    // Mark nextCheckAt into future atomically so other concurrent workers don't pick them up
    await EndpointModel.updateMany(
      { _id: { $in: dueEndpoints.map((ep) => ep._id) } },
      { $set: { nextCheckAt: tempLockDate } }
    );

    return dueIds;
  } catch (error) {
    console.error('❌ [Scheduler]: Error in MongoDB fallback popDueEndpoints:', error);
    return [];
  }
}

/**
 * Re-queues an endpoint for its next scheduled check based on interval minutes.
 */
export async function reQueueEndpoint(
  endpointId: string,
  intervalMinutes: number = SYSTEM_CONFIG.DEFAULT_CHECK_INTERVAL_MINUTES
): Promise<void> {
  const delayMs = intervalMinutes * 60 * 1000;
  await scheduleEndpointInRedis(endpointId, delayMs);
}


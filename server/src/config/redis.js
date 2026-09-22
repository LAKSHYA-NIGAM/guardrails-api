import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

let isConnected = false;

export const redis = new Redis({
  host: redisHost,
  port: redisPort,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  commandTimeout: 4000
});

redis.on('connect', () => {
  isConnected = true;
  console.log(`[Redis] Connection established with ${redisHost}:${redisPort}`);
});

redis.on('ready', () => {
  isConnected = true;
  console.log('[Redis] Ready to process commands');
});

redis.on('error', (err) => {
  isConnected = false;
  console.warn(`[Redis] Connectivity warning: ${err.message}. System operating in degraded fallback mode.`);
});

redis.on('close', () => {
  isConnected = false;
  console.warn('[Redis] Connection closed.');
});

redis.on('reconnecting', () => {
  console.log('[Redis] Reconnecting to cache layer...');
});

/**
 * Returns true if Redis connection is currently ready and active.
 * @returns {boolean}
 */
export function isRedisConnected() {
  return isConnected && redis.status === 'ready';
}

export default redis;

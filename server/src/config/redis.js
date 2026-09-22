import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;
let redisClient;

const redisOptions = {
  retryStrategy(times) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  commandTimeout: 4000
};

if (process.env.REDIS_URL) {
  // Support cloud connection strings (Upstash, Redis Cloud, Render, etc.)
  redisClient = new Redis(process.env.REDIS_URL, {
    ...redisOptions,
    tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });
} else {
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  const useTls = process.env.REDIS_TLS === 'true';

  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    tls: useTls ? { rejectUnauthorized: false } : undefined,
    ...redisOptions
  });
}

export const redis = redisClient;

redis.on('connect', () => {
  isConnected = true;
  console.log('[Redis] Connection established with Redis cache layer');
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

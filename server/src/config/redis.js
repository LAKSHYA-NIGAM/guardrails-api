import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;
let redisClient;

const useUpstashRest = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

if (useUpstashRest) {
  console.log('[Redis] Initializing Upstash HTTP Redis client for Serverless deployment...');
  const upstash = new UpstashRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });

  // Adapter to provide unified ioredis-compatible API over Upstash HTTP
  redisClient = {
    isUpstash: true,
    status: 'ready',
    async incr(key) {
      return await upstash.incr(key);
    },
    async decr(key) {
      return await upstash.decr(key);
    },
    async get(key) {
      const val = await upstash.get(key);
      if (val === null || val === undefined) return null;
      return typeof val === 'object' ? JSON.stringify(val) : String(val);
    },
    async set(key, value, ...args) {
      if (args.includes('NX') || args.includes('nx')) {
        const exIdx = args.findIndex((a) => String(a).toUpperCase() === 'EX');
        const exSec = exIdx !== -1 ? parseInt(args[exIdx + 1], 10) : undefined;
        return await upstash.set(key, value, { nx: true, ex: exSec });
      }
      if (args.includes('EX') || args.includes('ex')) {
        const exIdx = args.findIndex((a) => String(a).toUpperCase() === 'EX');
        const exSec = exIdx !== -1 ? parseInt(args[exIdx + 1], 10) : undefined;
        return await upstash.set(key, value, { ex: exSec });
      }
      return await upstash.set(key, value);
    },
    async expire(key, seconds) {
      return await upstash.expire(key, seconds);
    },
    async del(...keys) {
      if (keys.length === 0) return 0;
      return await upstash.del(...keys);
    },
    async keys(pattern) {
      return await upstash.keys(pattern);
    },
    async zadd(key, ...args) {
      // ioredis format: zadd(key, score, member)
      if (args.length === 2) {
        const [score, member] = args;
        return await upstash.zadd(key, { score: Number(score), member: String(member) });
      }
      return await upstash.zadd(key, ...args);
    },
    async zrevrange(key, start, stop, withScores) {
      if (withScores) {
        const results = await upstash.zrange(key, start, stop, { rev: true, withScores: true });
        // Format as [member1, score1, member2, score2, ...] matching ioredis
        const flat = [];
        if (Array.isArray(results)) {
          for (let i = 0; i < results.length; i += 2) {
            flat.push(results[i], results[i + 1]);
          }
        }
        return flat;
      }
      return await upstash.zrange(key, start, stop, { rev: true });
    },
    async zscore(key, member) {
      return await upstash.zscore(key, String(member));
    },
    async rpush(key, ...elements) {
      return await upstash.rpush(key, ...elements);
    },
    async lrange(key, start, stop) {
      return await upstash.lrange(key, start, stop);
    },
    async sadd(key, ...members) {
      return await upstash.sadd(key, ...members);
    },
    async smembers(key) {
      return await upstash.smembers(key);
    },
    async srem(key, ...members) {
      return await upstash.srem(key, ...members);
    },
    on(event, handler) {
      if (event === 'connect' || event === 'ready') {
        setTimeout(handler, 10);
      }
      return this;
    },
    async quit() {
      return 'OK';
    },
    disconnect() {}
  };

  isConnected = true;
} else if (process.env.REDIS_URL) {
  // Support TCP connection strings (rediss://...)
  const redisOptions = {
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    commandTimeout: 4000
  };

  redisClient = new Redis(process.env.REDIS_URL, {
    ...redisOptions,
    tls: process.env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });

  redisClient.on('connect', () => { isConnected = true; });
  redisClient.on('ready', () => { isConnected = true; });
  redisClient.on('error', (err) => {
    isConnected = false;
    console.warn(`[Redis] Connectivity warning: ${err.message}. Degraded mode.`);
  });
  redisClient.on('close', () => { isConnected = false; });
} else {
  // Standard TCP connection (Docker / Localhost)
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;
  const useTls = process.env.REDIS_TLS === 'true';

  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    tls: useTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    commandTimeout: 4000
  });

  redisClient.on('connect', () => { isConnected = true; });
  redisClient.on('ready', () => { isConnected = true; });
  redisClient.on('error', (err) => {
    isConnected = false;
    console.warn(`[Redis] Connectivity warning: ${err.message}. Degraded mode.`);
  });
  redisClient.on('close', () => { isConnected = false; });
}

export const redis = redisClient;

export function isRedisConnected() {
  if (useUpstashRest) return true;
  return isConnected && redis.status === 'ready';
}

export default redis;

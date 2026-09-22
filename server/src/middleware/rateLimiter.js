import redis, { isRedisConnected } from '../config/redis.js';

const DEFAULT_LIMIT = 20; // 20 requests per window
const WINDOW_SECONDS = 60; // 1 minute window

/**
 * Fixed-Window Rate Limiter Middleware backed by Redis.
 *
 * NOTE ON PRODUCTION RATE LIMITING ARCHITECTURES:
 * This middleware implements a fixed-window counter using Redis INCR and EXPIRE.
 * In production systems with strict burst guarantees, a sliding-window log or
 * sliding-window counter using Redis Sorted Sets (ZADD timestamp, ZREMRANGEBYSCORE, ZCARD)
 * or Token Bucket (Redis Lua script) avoids the boundary burst problem (where a client
 * sends 2x requests across the minute boundary). The fixed-window approach offers
 * minimal Redis memory footprint and O(1) CPU efficiency.
 *
 * @param {number} limit Max allowed requests per window
 * @param {number} windowSec Window duration in seconds
 */
export function createRateLimiter(limit = DEFAULT_LIMIT, windowSec = WINDOW_SECONDS) {
  return async function rateLimiter(req, res, next) {
    // Graceful degradation check: if Redis is offline, pass through and log
    if (!isRedisConnected()) {
      console.warn('[RateLimiter] Redis is offline. Rate limiting temporarily degraded.');
      return next();
    }

    try {
      // Identifier: authenticated User ID, Bot ID, or Client IP address
      const identifier = req.user?.id
        ? `user:${req.user.id}`
        : req.bot?.id
        ? `bot:${req.bot.id}`
        : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;

      const now = Math.floor(Date.now() / 1000);
      const windowIndex = Math.floor(now / windowSec);
      const key = `ratelimit:${identifier}:${windowIndex}`;

      const current = await redis.incr(key);

      // Set TTL only on the first request of this window
      if (current === 1) {
        await redis.expire(key, windowSec + 2);
      }

      // Add standard rate limit headers
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      const resetTime = (windowIndex + 1) * windowSec;
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (current > limit) {
        const retryAfter = Math.max(1, resetTime - now);
        res.setHeader('Retry-After', retryAfter);

        console.warn(`[RateLimiter] Rate limit exceeded for ${identifier} (${current}/${limit})`);

        return res.status(429).json({
          status: 429,
          error: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Maximum ${limit} requests per minute allowed.`,
          retryAfterSeconds: retryAfter,
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter] Error evaluating rate limit:', err.message);
      // Fail-open for rate limiter so transient Redis errors don't block legitimate users
      next();
    }
  };
}

export const writeRateLimiter = createRateLimiter(20, 60);
export default writeRateLimiter;

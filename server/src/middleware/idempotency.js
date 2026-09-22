import redis, { isRedisConnected } from '../config/redis.js';

const IN_PROGRESS_TTL = 120; // 2 minutes
const COMPLETED_TTL = 3600;  // 1 hour cache for idempotent replay

/**
 * Idempotency Key Middleware for write endpoints.
 *
 * Prevents double charges, duplicate posts, duplicate comments, or duplicate likes
 * if a client experiences network timeouts and retries with the same Idempotency-Key.
 */
export async function requireIdempotency(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'] || req.headers['Idempotency-Key'];

  // If no idempotency key was supplied by client, proceed normally
  if (!idempotencyKey || !idempotencyKey.trim()) {
    return next();
  }

  // Graceful degradation: if Redis is offline, continue without caching
  if (!isRedisConnected()) {
    console.warn('[Idempotency] Redis offline, proceeding without idempotency check');
    return next();
  }

  const key = `idempotency:${idempotencyKey.trim()}`;

  try {
    const rawExisting = await redis.get(key);

    if (rawExisting) {
      const cached = JSON.parse(rawExisting);

      if (cached.status === 'IN_PROGRESS') {
        return res.status(409).json({
          status: 409,
          error: 'IDEMPOTENCY_IN_PROGRESS',
          message: 'A request with this Idempotency-Key is currently being processed.',
          timestamp: new Date().toISOString()
        });
      }

      if (cached.status === 'COMPLETED') {
        console.info(`[Idempotency] Replaying cached response for key: ${idempotencyKey}`);
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(cached.statusCode || 200).json(cached.body);
      }
    }

    // Atomically claim the idempotency slot with IN_PROGRESS status
    const claimed = await redis.set(
      key,
      JSON.stringify({ status: 'IN_PROGRESS', createdAt: new Date().toISOString() }),
      'EX',
      IN_PROGRESS_TTL,
      'NX'
    );

    if (!claimed) {
      return res.status(409).json({
        status: 409,
        error: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'A request with this Idempotency-Key is currently in progress.',
        timestamp: new Date().toISOString()
      });
    }

    // Wrap res.json to capture response body on completion
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        // Cache the successful outcome
        redis
          .set(
            key,
            JSON.stringify({
              status: 'COMPLETED',
              statusCode: res.statusCode,
              body
            }),
            'EX',
            COMPLETED_TTL
          )
          .catch((err) => console.error('[Idempotency] Failed to cache completion:', err.message));
      } else {
        // If operation failed (4xx, 5xx), release the idempotency key so it can be retried
        redis.del(key).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error('[Idempotency] Middleware error:', err.message);
    next();
  }
}

export default requireIdempotency;

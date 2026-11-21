/**
 * Token Bucket Rate Limiter Guardrail Engine
 * Controls burst traffic and refills tokens at a fixed rate per consumer.
 */

export class TokenBucketLimiter {
  constructor({ capacity = 10, refillRatePerSecond = 2 } = {}) {
    this.capacity = capacity;
    this.refillRate = refillRatePerSecond;
    this.buckets = new Map();
  }

  getBucket(clientId) {
    const now = Date.now();
    let bucket = this.buckets.get(clientId);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(clientId, bucket);
      return bucket;
    }

    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    return bucket;
  }

  tryConsume(clientId, cost = 1) {
    if (!clientId) {
      return { allowed: false, remainingTokens: 0, reason: 'Missing client identifier' };
    }

    const bucket = this.getBucket(clientId);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remainingTokens: Math.floor(bucket.tokens),
        capacity: this.capacity
      };
    }

    return {
      allowed: false,
      remainingTokens: Math.floor(bucket.tokens),
      capacity: this.capacity,
      retryAfterSeconds: Math.ceil((cost - bucket.tokens) / this.refillRate)
    };
  }

  reset(clientId) {
    if (clientId) {
      this.buckets.delete(clientId);
    } else {
      this.buckets.clear();
    }
  }
}

export default TokenBucketLimiter;

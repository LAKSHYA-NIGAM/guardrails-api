import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TokenBucketLimiter } from '../src/services/tokenBucketGuardrail.js';

describe('Token Bucket Rate Limiter Guardrail Tests', () => {
  test('allows requests within burst capacity', () => {
    const limiter = new TokenBucketLimiter({ capacity: 5, refillRatePerSecond: 1 });
    const clientId = 'client_test_1';

    for (let i = 0; i < 5; i++) {
      const res = limiter.tryConsume(clientId, 1);
      assert.equal(res.allowed, true, `Request ${i + 1} should be allowed`);
    }

    // 6th request should be rejected
    const blocked = limiter.tryConsume(clientId, 1);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds >= 1);
  });

  test('refills tokens over time', async () => {
    const limiter = new TokenBucketLimiter({ capacity: 2, refillRatePerSecond: 10 });
    const clientId = 'client_test_2';

    assert.equal(limiter.tryConsume(clientId, 2).allowed, true);
    assert.equal(limiter.tryConsume(clientId, 1).allowed, false);

    // Wait 250ms for tokens to refill (10 tokens/sec * 0.25s = 2.5 tokens)
    await new Promise((resolve) => setTimeout(resolve, 250));

    const refilled = limiter.tryConsume(clientId, 1);
    assert.equal(refilled.allowed, true);
  });

  test('supports custom token costs for expensive operations', () => {
    const limiter = new TokenBucketLimiter({ capacity: 10, refillRatePerSecond: 1 });
    const clientId = 'client_heavy';

    const heavyOperation = limiter.tryConsume(clientId, 8);
    assert.equal(heavyOperation.allowed, true);
    assert.equal(heavyOperation.remainingTokens, 2);

    const secondHeavy = limiter.tryConsume(clientId, 5);
    assert.equal(secondHeavy.allowed, false);
  });

  test('isolates limits across different client IDs', () => {
    const limiter = new TokenBucketLimiter({ capacity: 2, refillRatePerSecond: 1 });

    assert.equal(limiter.tryConsume('client_A', 2).allowed, true);
    assert.equal(limiter.tryConsume('client_A', 1).allowed, false);

    // Client B should still have full quota
    assert.equal(limiter.tryConsume('client_B', 2).allowed, true);
  });
});

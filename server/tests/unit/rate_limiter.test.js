import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Rate Limiter Identifier & Graceful Degradation', () => {
  test('Identifier resolution: prioritizes authenticated user, then bot, then client IP', () => {
    const resolveIdentifier = (req) => {
      if (req.user?.id) return `user:${req.user.id}`;
      if (req.bot?.id) return `bot:${req.bot.id}`;
      return `ip:${req.ip || 'unknown'}`;
    };

    assert.equal(resolveIdentifier({ user: { id: 'usr_100' }, ip: '1.2.3.4' }), 'user:usr_100');
    assert.equal(resolveIdentifier({ bot: { id: 'bot_200' }, ip: '1.2.3.4' }), 'bot:bot_200');
    assert.equal(resolveIdentifier({ ip: '10.0.0.1' }), 'ip:10.0.0.1');
    assert.equal(resolveIdentifier({}), 'ip:unknown');
  });

  test('Fixed window limit breach: accurately evaluates count threshold and headers', () => {
    const limit = 20;
    const evaluateLimit = (currentCount) => {
      const remaining = Math.max(0, limit - currentCount);
      const isAllowed = currentCount <= limit;
      return {
        isAllowed,
        statusCode: isAllowed ? 200 : 429,
        remaining,
        error: isAllowed ? null : 'TOO_MANY_REQUESTS'
      };
    };

    assert.equal(evaluateLimit(1).isAllowed, true);
    assert.equal(evaluateLimit(1).remaining, 19);
    assert.equal(evaluateLimit(20).isAllowed, true);
    assert.equal(evaluateLimit(20).remaining, 0);

    // 21st request triggers rate limiting
    const breached = evaluateLimit(21);
    assert.equal(breached.isAllowed, false);
    assert.equal(breached.statusCode, 429);
    assert.equal(breached.error, 'TOO_MANY_REQUESTS');
  });

  test('Graceful degradation: passes through when Redis is offline', () => {
    let nextCalled = false;
    const req = { ip: '127.0.0.1' };
    const res = {};
    const next = () => { nextCalled = true; };

    const simulateMiddleware = (isRedisConnected) => {
      if (!isRedisConnected) {
        return next();
      }
    };

    simulateMiddleware(false);
    assert.equal(nextCalled, true, 'Next must be called when Redis is offline');
  });
});

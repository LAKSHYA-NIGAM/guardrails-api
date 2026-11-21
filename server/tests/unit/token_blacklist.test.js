import assert from 'node:assert';
import test from 'node:test';
import { TokenBlacklistStore } from '../../src/utils/tokenBlacklistStore.js';

test('TokenBlacklistStore: revoking and checking token status', () => {
  const store = new TokenBlacklistStore();
  const jti = 'jwt-token-id-12345';

  assert.strictEqual(store.isRevoked(jti), false);
  store.revoke(jti, 60);
  assert.strictEqual(store.isRevoked(jti), true);
});

test('TokenBlacklistStore: automatically invalidates expired tokens', async () => {
  const store = new TokenBlacklistStore();
  const jti = 'short-lived-token';

  // Revoke with 0.05 second TTL (50ms)
  store.revoke(jti, 0.05);
  assert.strictEqual(store.isRevoked(jti), true);

  await new Promise((res) => setTimeout(res, 80));
  // Expired now
  assert.strictEqual(store.isRevoked(jti), false);
});

test('TokenBlacklistStore: purgeExpired cleans all elapsed tokens', async () => {
  const store = new TokenBlacklistStore();
  store.revoke('t1', 0.04);
  store.revoke('t2', 300); // 5 minutes

  await new Promise((res) => setTimeout(res, 60));
  const purged = store.purgeExpired();
  assert.strictEqual(purged, 1);
  assert.strictEqual(store.size(), 1);
  assert.strictEqual(store.isRevoked('t2'), true);
});

import assert from 'node:assert';
import test from 'node:test';
import { calculateObjectDepth, validatePayloadSafety } from '../../src/utils/payloadDepthProtector.js';

test('calculateObjectDepth: measures flat and nested objects', () => {
  const flat = { a: 1, b: 2 };
  assert.strictEqual(calculateObjectDepth(flat), 1);

  const nested3 = { a: { b: { c: 3 } } };
  assert.strictEqual(calculateObjectDepth(nested3), 3);
});

test('validatePayloadSafety: catches deep nesting attack payloads', () => {
  // Construct 12 levels deep
  let deepObj = { val: 'leaf' };
  for (let i = 0; i < 11; i++) {
    deepObj = { child: deepObj };
  }

  const result = validatePayloadSafety(deepObj, { maxDepth: 5 });
  assert.strictEqual(result.isSafe, false);
  assert.ok(result.reason.includes('exceeds maximum allowed nesting depth'));
});

test('validatePayloadSafety: allows standard clean JSON bodies', () => {
  const safe = {
    user: { id: '123', profile: { name: 'Lakshya', city: 'Delhi' } },
    action: 'update',
  };
  const res = validatePayloadSafety(safe, { maxDepth: 5, maxKeys: 100 });
  assert.strictEqual(res.isSafe, true);
  assert.strictEqual(res.depth, 3);
});

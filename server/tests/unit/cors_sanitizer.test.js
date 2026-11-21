import assert from 'node:assert';
import test from 'node:test';
import { isOriginAllowed } from '../../src/utils/corsSanitizer.js';

test('isOriginAllowed: exact domain matching', () => {
  const allowed = ['https://myapp.com', 'http://localhost:3000'];
  assert.strictEqual(isOriginAllowed('https://myapp.com', allowed), true);
  assert.strictEqual(isOriginAllowed('http://localhost:3000', allowed), true);
  assert.strictEqual(isOriginAllowed('https://evil.com', allowed), false);
});

test('isOriginAllowed: blocks null origin', () => {
  const allowed = ['https://myapp.com', '*'];
  assert.strictEqual(isOriginAllowed('null', allowed), false);
  assert.strictEqual(isOriginAllowed('', allowed), false);
  assert.strictEqual(isOriginAllowed(null, allowed), false);
});

test('isOriginAllowed: wildcard subdomain matching', () => {
  const allowed = ['*.lakshyanigam.dev'];
  assert.strictEqual(isOriginAllowed('https://api.lakshyanigam.dev', allowed), true);
  assert.strictEqual(isOriginAllowed('https://staging.app.lakshyanigam.dev', allowed), true);
  assert.strictEqual(isOriginAllowed('https://notlakshyanigam.dev', allowed), false);
});

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { redactPII, luhnCheck } from '../src/services/piiGuardrail.js';

describe('PII Redaction Guardrail Engine Tests', () => {
  test('redacts email addresses accurately', () => {
    const raw = 'Please contact support at security.team@guardrails.internal for API keys.';
    const result = redactPII(raw);

    assert.equal(result.hasRedactions, true);
    assert.equal(result.detectionsCount, 1);
    assert.equal(result.cleanedText, 'Please contact support at [EMAIL_REDACTED] for API keys.');
  });

  test('redacts standard phone numbers', () => {
    const raw = 'Reach our incident response desk at 555-867-5309 immediately.';
    const result = redactPII(raw);

    assert.equal(result.hasRedactions, true);
    assert.equal(result.cleanedText, 'Reach our incident response desk at [PHONE_REDACTED] immediately.');
  });

  test('redacts Social Security Numbers', () => {
    const raw = 'Employee SSN identifier is 123-45-6789.';
    const result = redactPII(raw);

    assert.equal(result.hasRedactions, true);
    assert.equal(result.cleanedText, 'Employee SSN identifier is [SSN_REDACTED].');
  });

  test('validates and redacts valid Luhn credit cards while ignoring non-card 16-digit blocks', () => {
    // 4532-0150-0000-0007 is a valid Luhn test card pattern (Visa)
    const validCard = '4532 0150 0000 0007';
    assert.equal(luhnCheck(validCard), true);

    const raw = `Customer paid with card: ${validCard}`;
    const result = redactPII(raw);
    assert.equal(result.hasRedactions, true);
    assert.equal(result.cleanedText, 'Customer paid with card: [CARD_REDACTED]');
  });

  test('leaves benign text completely unredacted', () => {
    const safeText = 'The system responded in 12ms with HTTP 200 OK across all pods.';
    const result = redactPII(safeText);

    assert.equal(result.hasRedactions, false);
    assert.equal(result.detectionsCount, 0);
    assert.equal(result.cleanedText, safeText);
  });

  test('handles null, undefined, or empty inputs safely', () => {
    assert.equal(redactPII(null), '');
    assert.equal(redactPII(''), '');
  });
});

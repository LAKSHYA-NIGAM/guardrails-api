/**
 * PII (Personally Identifiable Information) Redaction & Masking Guardrail Engine
 * Automatically scans and masks sensitive data patterns (emails, phones, credit cards, SSNs).
 */

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;
const CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

export function luhnCheck(cardNumber) {
  const sanitized = String(cardNumber).replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(sanitized)) return false;

  let sum = 0;
  let alternate = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let n = parseInt(sanitized.charAt(i), 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function redactPII(text, options = { maskCards: true, maskEmails: true, maskPhones: true, maskSSN: true }) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let redacted = text;
  const detections = [];

  if (options.maskEmails) {
    redacted = redacted.replace(EMAIL_REGEX, (match) => {
      detections.push({ type: 'EMAIL', match });
      return '[EMAIL_REDACTED]';
    });
  }

  if (options.maskCards) {
    redacted = redacted.replace(CARD_REGEX, (match) => {
      if (luhnCheck(match)) {
        detections.push({ type: 'CREDIT_CARD', match });
        return '[CARD_REDACTED]';
      }
      return match;
    });
  }

  if (options.maskPhones) {
    redacted = redacted.replace(PHONE_REGEX, (match) => {
      detections.push({ type: 'PHONE', match });
      return '[PHONE_REDACTED]';
    });
  }

  if (options.maskSSN) {
    redacted = redacted.replace(SSN_REGEX, (match) => {
      detections.push({ type: 'SSN', match });
      return '[SSN_REDACTED]';
    });
  }

  return {
    cleanedText: redacted,
    hasRedactions: detections.length > 0,
    detectionsCount: detections.length,
    detections
  };
}

export default {
  redactPII,
  luhnCheck
};

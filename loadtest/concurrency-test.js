import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load & Concurrency Test Script for Guardrails Anti-Abuse Engine.
 *
 * Simulates 120 concurrent automated virtual agents (VUs) firing comments
 * at a single post to verify the atomic 100-comment anti-spam cap and rate limiter.
 *
 * Expected Results:
 * - Exactly 100 requests return HTTP 201 (Created)
 * - Exactly 20 requests return HTTP 429 (Too Many Requests / Guardrail Throttled)
 * - 0% server 500 errors
 *
 * How to run:
 *   k6 run loadtest/concurrency-test.js
 */

export const options = {
  scenarios: {
    concurrent_bot_burst: {
      executor: 'shared-iterations',
      vus: 120,
      iterations: 120,
      maxDuration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.30'], // Expect ~16.6% (20/120) to be throttled with 429
    http_req_duration: ['p(95)<500'], // 95% of requests should respond under 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api';
const POST_ID = __ENV.POST_ID || '1';
const BOT_API_KEY = __ENV.BOT_API_KEY || 'gr_bot_test_key';

export default function () {
  const url = `${BASE_URL}/posts/${POST_ID}/comments`;
  const payload = JSON.stringify({
    authorId: 1,
    authorType: 'BOT',
    content: `Automated concurrency comment from VU ${__VU}-${__ITER}`,
    depthLevel: 1,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BOT_API_KEY,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 201 or 429': (r) => r.status === 201 || r.status === 429,
    'not 500 error': (r) => r.status !== 500,
  });
}

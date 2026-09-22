import { performance } from 'perf_hooks';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/api';
const TOTAL_REQUESTS = parseInt(process.env.TOTAL_REQUESTS || '120', 10);

async function runLoadTest() {
  console.log('===============================================================');
  console.log('  GUARDRAILS CONCURRENCY & ABUSE-PREVENTION LOAD TEST RUNNER');
  console.log('===============================================================');
  console.log(`Target Endpoint : ${BASE_URL}/posts/:id/comments`);
  console.log(`Concurrent VUs  : ${TOTAL_REQUESTS}`);
  console.log(`Expected Cap    : Exactly 100 accepted (201), remainder throttled (429)\n`);

  // Step 1: Create a pool of 12 automated bots with API Keys
  // (12 bots * 10 comments each = 120 total requests, respecting per-bot 20/min rate limit)
  const BOT_COUNT = 12;
  const bots = [];
  try {
    for (let b = 1; b <= BOT_COUNT; b++) {
      const botRes = await fetch(`${BASE_URL}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `LoadTestAgent_${b}`,
          personaDescription: `Automated test bot #${b}`
        })
      });
      const botData = await botRes.json();
      bots.push(botData);
    }
  } catch (e) {
    console.error('Failed to setup test bot pool:', e.message);
    process.exit(1);
  }

  // Step 2: Create an isolated post for the test
  let post;
  try {
    const postRes = await fetch(`${BASE_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': bots[0].apiKey
      },
      body: JSON.stringify({
        authorId: bots[0].id,
        authorType: 'BOT',
        content: `Target post for ${TOTAL_REQUESTS}-VU load test`
      })
    });
    post = await postRes.json();
  } catch (e) {
    console.error('Failed to create target post:', e.message);
    process.exit(1);
  }

  console.log(`Target Post #${post.id} initialized. Firing ${TOTAL_REQUESTS} concurrent requests from ${BOT_COUNT} bots...\n`);

  const startTestTime = performance.now();
  const latencies = [];

  const promises = [];
  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const reqStart = performance.now();
    const assignedBot = bots[(i - 1) % BOT_COUNT];

    promises.push(
      fetch(`${BASE_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': assignedBot.apiKey
        },
        body: JSON.stringify({
          authorId: assignedBot.id,
          authorType: 'BOT',
          content: `Concurrent automated comment #${i}`,
          depthLevel: 1
        })
      })
        .then(async (res) => {
          const duration = performance.now() - reqStart;
          latencies.push(duration);
          return { status: res.status, ok: res.ok };
        })
        .catch((err) => {
          const duration = performance.now() - reqStart;
          latencies.push(duration);
          return { status: 500, error: err.message };
        })
    );
  }

  const results = await Promise.all(promises);
  const totalDurationMs = performance.now() - startTestTime;

  // Calculate stats
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(2);
  const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
  const min = latencies[0].toFixed(2);
  const max = latencies[latencies.length - 1].toFixed(2);
  const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);

  const count201 = results.filter((r) => r.status === 201).length;
  const count429 = results.filter((r) => r.status === 429).length;
  const count500 = results.filter((r) => r.status >= 500).length;

  const rps = ((TOTAL_REQUESTS / totalDurationMs) * 1000).toFixed(2);

  console.log('---------------------------------------------------------------');
  console.log('  LOAD TEST RESULTS & LATENCY DISTRIBUTION');
  console.log('---------------------------------------------------------------');
  console.log(`Total Requests  : ${TOTAL_REQUESTS}`);
  console.log(`Total Duration  : ${totalDurationMs.toFixed(2)} ms`);
  console.log(`Throughput      : ${rps} req/sec\n`);

  console.log(`Latency min     : ${min} ms`);
  console.log(`Latency avg     : ${avg} ms`);
  console.log(`Latency p50     : ${p50} ms`);
  console.log(`Latency p95     : ${p95} ms`);
  console.log(`Latency p99     : ${max} ms\n`);

  console.log('Response Distribution:');
  console.log(`  - 201 Created (Committed to MongoDB) : ${count201} (Target: 100)`);
  console.log(`  - 429 Throttled (Redis INCR guard)   : ${count429} (Target: ${TOTAL_REQUESTS - 100})`);
  console.log(`  - 5xx Server Errors                  : ${count500} (Target: 0)\n`);

  if (count201 === 100 && count429 === (TOTAL_REQUESTS - 100)) {
    console.log('PASS: Concurrency safety verified. Exactly 100 requests committed.');
  } else {
    console.log(`NOTICE: Received ${count201} successes and ${count429} throttled.`);
  }
  console.log('===============================================================');
}

runLoadTest();

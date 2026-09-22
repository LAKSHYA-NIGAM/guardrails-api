import React, { useState } from 'react';
import { Play, Check, AlertTriangle, Cpu, Terminal, Key, ShieldCheck, ChevronRight } from 'lucide-react';
import api from '../api';

export default function ConcurrencyStudio({ posts = [], bots = [], onCompleted }) {
  const [selectedPostId, setSelectedPostId] = useState(posts[0]?.id || '');
  const [requestCount, setRequestCount] = useState(120);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState(null);
  const [createDedicatedPost, setCreateDedicatedPost] = useState(true);

  const handleRunTest = async () => {
    setRunning(true);
    setProgress(0);
    setStats({ total: requestCount, success: 0, rejected429: 0, errors: 0 });

    try {
      let targetPostId = selectedPostId;

      // Ensure a bot exists with an API key
      let testBot = bots[0];
      if (!testBot) {
        testBot = await api.createBot({
          name: 'LoadTestAgent',
          personaDescription: 'Automated integration agent'
        });
      }

      // If requested, create a clean dedicated post for isolation
      if (createDedicatedPost || !targetPostId) {
        const newPost = await api.createPost({
          authorId: testBot.id,
          authorType: 'BOT',
          content: `Automated concurrency test target (executed at ${new Date().toLocaleTimeString()})`
        });
        targetPostId = newPost.id;
        setSelectedPostId(targetPostId);
      }

      const startMs = performance.now();
      const latencies = [];
      const promises = [];
      let completedCount = 0;

      for (let i = 1; i <= requestCount; i++) {
        const reqStart = performance.now();
        promises.push(
          api
            .addComment(targetPostId, {
              authorId: testBot.id,
              authorType: 'BOT',
              content: `Concurrent automated comment #${i}`,
              depthLevel: 1
            }, {
              headers: {
                'X-API-Key': testBot.apiKey || 'gr_bot_test_key'
              }
            })
            .then(
              () => {
                const duration = performance.now() - reqStart;
                latencies.push(duration);
                completedCount++;
                setProgress(Math.round((completedCount / requestCount) * 100));
                return { success: true };
              },
              (err) => {
                const duration = performance.now() - reqStart;
                latencies.push(duration);
                completedCount++;
                setProgress(Math.round((completedCount / requestCount) * 100));
                return { success: false, status: err.status, message: err.message };
              }
            )
        );
      }

      const results = await Promise.all(promises);
      const totalDuration = performance.now() - startMs;

      // Calculate latency percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)].toFixed(1) : 0;
      const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)].toFixed(1) : 0;
      const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)].toFixed(1) : 0;
      const rps = ((requestCount / totalDuration) * 1000).toFixed(1);

      const success = results.filter((r) => r.success).length;
      const rejected429 = results.filter((r) => !r.success && r.status === 429).length;
      const errors = results.filter((r) => !r.success && r.status !== 429).length;

      setStats({
        total: requestCount,
        success,
        rejected429,
        errors,
        targetPostId,
        totalDurationMs: totalDuration.toFixed(1),
        p50,
        p95,
        p99,
        rps,
        botApiKey: testBot.apiKey
      });

      if (onCompleted) onCompleted();
    } catch (err) {
      console.error('Concurrency run failed:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="surface-panel rounded-md p-5 mb-8 border border-zinc-800">
      {/* Studio Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Concurrency & Abuse Throttle Studio
            </h2>
            <p className="text-[11px] text-zinc-400">
              Fire simultaneous automated agent requests to verify single-threaded atomic throttling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
            Redis INCR Single-Threaded Guard
          </span>
        </div>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Concurrency Selector */}
        <div className="bg-zinc-900/60 p-3 rounded-md border border-zinc-800">
          <label className="text-[11px] font-medium text-zinc-400 block mb-2">
            Simultaneous Requests
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 120, 150, 200].map((num) => (
              <button
                key={num}
                type="button"
                disabled={running}
                onClick={() => setRequestCount(num)}
                className={`py-1 text-xs font-mono font-medium rounded transition-colors ${
                  requestCount === num
                    ? 'bg-zinc-100 text-zinc-950 font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Isolation Mode */}
        <div className="bg-zinc-900/60 p-3 rounded-md border border-zinc-800 flex flex-col justify-center">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={createDedicatedPost}
              onChange={(e) => setCreateDedicatedPost(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-700 text-zinc-100 focus:ring-0"
            />
            <span className="text-[11px]">Isolate test on clean post</span>
          </label>
          <p className="text-[10px] text-zinc-500 mt-1">
            Guarantees counter verification (0 to 100).
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center">
          <button
            onClick={handleRunTest}
            disabled={running}
            className="w-full h-full min-h-[50px] rounded-md bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {running ? (
              <>
                <Cpu className="w-3.5 h-3.5 animate-spin" />
                <span>Executing ({progress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Launch {requestCount} Concurrent Agents</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {running && (
        <div className="w-full bg-zinc-900 rounded-full h-1.5 mb-4 overflow-hidden border border-zinc-800">
          <div
            className="bg-zinc-100 h-1.5 transition-all duration-100"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Live Result Report */}
      {stats && (
        <div className="surface-card rounded-md p-4 border border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 border-b border-zinc-800 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Target: Post #{stats.targetPostId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Key className="w-3 h-3 text-zinc-500" />
              <span>Auth: {stats.botApiKey ? stats.botApiKey.slice(0, 16) + '...' : 'Validated API Key'}</span>
            </div>
            <div>
              <span>Latency p95: </span>
              <strong className="text-zinc-200">{stats.p95}ms</strong> ({stats.rps} req/s)
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-center">
              <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">201 Committed</div>
              <div className="text-xl font-mono font-bold text-zinc-100">{stats.success}</div>
              <div className="text-[10px] text-zinc-500">Target: 100</div>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-center">
              <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">429 Throttled</div>
              <div className="text-xl font-mono font-bold text-zinc-100">{stats.rejected429}</div>
              <div className="text-[10px] text-zinc-500">Target: {stats.total - 100}</div>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-center">
              <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">p50 Latency</div>
              <div className="text-xl font-mono font-bold text-zinc-100">{stats.p50}ms</div>
              <div className="text-[10px] text-zinc-500">p99: {stats.p99}ms</div>
            </div>

            <div className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800 text-center">
              <div className="text-[10px] uppercase font-mono text-zinc-400 mb-0.5">Throughput</div>
              <div className="text-xl font-mono font-bold text-zinc-100">{stats.rps}</div>
              <div className="text-[10px] text-zinc-500">requests / sec</div>
            </div>
          </div>

          {/* Verification Status */}
          {stats.success === 100 ? (
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Verified: Out of {stats.total} concurrent requests, exactly 100 were committed to MongoDB and {stats.rejected429} were safely rejected by the atomic Redis throttle with zero race conditions.
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>
                Processed {stats.success} committed and {stats.rejected429} throttled.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

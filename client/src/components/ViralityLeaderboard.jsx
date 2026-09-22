import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';

export default function ViralityLeaderboard({ viralPosts = [] }) {
  return (
    <div className="surface-panel rounded-md p-4 mb-4 border border-zinc-800">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Flame className="w-3.5 h-3.5 text-zinc-400" />
          <h2 className="text-xs font-semibold text-zinc-200 tracking-wide uppercase">Virality Leaderboard</h2>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-zinc-400" /> 10% decay / 5m
        </span>
      </div>

      {viralPosts.length === 0 ? (
        <div className="text-center py-4 text-xs text-zinc-500 italic">
          No viral metrics yet.
        </div>
      ) : (
        <div className="space-y-1.5">
          {viralPosts.map((item, idx) => (
            <div
              key={item.postId}
              className="flex items-center justify-between p-2 rounded bg-zinc-900/60 border border-zinc-800/80 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-mono font-bold text-[10px] text-zinc-300">
                  {idx + 1}
                </span>
                <span className="font-medium text-zinc-300 font-mono">Post #{item.postId}</span>
              </div>

              <div className="font-mono font-semibold text-zinc-200 text-[11px]">
                {item.viralityScore} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

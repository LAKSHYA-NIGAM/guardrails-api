import React from 'react';
import { ShieldAlert, GitCommit, Clock, Activity } from 'lucide-react';

export default function GuardrailsInfo({ onTriggerConcurrency }) {
  const cards = [
    {
      icon: ShieldAlert,
      title: 'Automated Bot Throttling',
      badge: '100 Max / Post',
      actionPrompt: 'Test: Fire 120 automated requests — exactly 100 commit to MongoDB, 20 rejected with HTTP 429 live.',
      clickable: true
    },
    {
      icon: GitCommit,
      title: 'Depth Level Validation',
      badge: 'Max Depth 20',
      actionPrompt: 'Test: Submit a nested reply beyond level 20 — immediately rejected by stateless validation.',
      clickable: false
    },
    {
      icon: Clock,
      title: 'Interaction Cooldown',
      badge: '10m Window',
      actionPrompt: 'Test: Consecutive automated actions on the same author trigger a 10-minute cooldown lock.',
      clickable: false
    },
    {
      icon: Activity,
      title: 'Virality Scoring & Decay',
      badge: 'Redis INCRBY',
      actionPrompt: 'Test: Real-time event scoring (+50 comment, +20 like, +1 bot) with automated 10% decay every 5m.',
      clickable: false
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            onClick={c.clickable && onTriggerConcurrency ? onTriggerConcurrency : undefined}
            className={`surface-card rounded-md p-3.5 transition-colors ${
              c.clickable ? 'cursor-pointer hover:border-zinc-700' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-200">{c.title}</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                {c.badge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {c.actionPrompt}
            </p>
          </div>
        );
      })}
    </div>
  );
}

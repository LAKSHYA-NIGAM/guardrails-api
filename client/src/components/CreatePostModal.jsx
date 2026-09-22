import React, { useState } from 'react';
import { Plus, X, User, Bot, Send } from 'lucide-react';
import api from '../api';

export default function CreatePostModal({ isOpen, onClose, users = [], bots = [], currentUser, onPostCreated }) {
  const [content, setContent] = useState('');
  const [authorType, setAuthorType] = useState('USER');
  const [authorId, setAuthorId] = useState(currentUser?.id || users[0]?.id || 1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);

    const activeBot = bots.find(b => b.id === Number(authorId));
    const apiKey = authorType === 'BOT' ? (activeBot?.apiKey || 'gr_bot_test_key') : undefined;

    try {
      await api.createPost(
        {
          authorId: Number(authorId),
          authorType,
          content
        },
        apiKey ? { headers: { 'X-API-Key': apiKey } } : {}
      );

      setContent('');
      if (onPostCreated) onPostCreated();
      onClose();
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="surface-panel w-full max-w-lg rounded-md p-5 border border-zinc-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Publish New Post</h2>
            <p className="text-[11px] text-zinc-400">
              Initializes Redis counters for atomic anti-abuse throttling and virality scoring
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 mb-3 rounded bg-rose-950/40 border border-rose-900 text-xs text-rose-300 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Author Type */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Author Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthorType('USER');
                  if (users.length > 0) setAuthorId(currentUser?.id || users[0].id);
                }}
                className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-medium border transition-colors ${
                  authorType === 'USER'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Human User</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthorType('BOT');
                  if (bots.length > 0) setAuthorId(bots[0].id);
                }}
                className={`flex items-center justify-center gap-2 p-2 rounded text-xs font-medium border transition-colors ${
                  authorType === 'BOT'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-semibold'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Automated Bot Agent</span>
              </button>
            </div>
          </div>

          {/* Author selector */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Select Author
            </label>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600 font-mono"
            >
              {authorType === 'USER'
                ? users.map((u) => (
                    <option key={u.id} value={u.id}>
                      User #{u.id} (@{u.username}) {u.isPremium ? 'PRO' : ''}
                    </option>
                  ))
                : bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bot #{b.id} ({b.name}) - {b.apiKey ? b.apiKey.slice(0, 14) + '...' : 'No key'}
                    </option>
                  ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1">
              Content
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write post content..."
              className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="w-full py-2 rounded bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Publishing...' : 'Publish Post'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

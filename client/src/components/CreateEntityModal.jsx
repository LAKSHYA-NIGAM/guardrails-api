import React, { useState } from 'react';
import { User, Bot, X, Key, Copy, Check } from 'lucide-react';
import api from '../api';

export default function CreateEntityModal({ isOpen, onClose, onCreated }) {
  const [tab, setTab] = useState('BOT'); // Default to registering automated agents
  const [username, setUsername] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [botName, setBotName] = useState('');
  const [personaDescription, setPersonaDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [createdBot, setCreatedBot] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createUser({ username: username.trim(), isPremium });
      setUsername('');
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBot = async (e) => {
    e.preventDefault();
    if (!botName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createBot({ name: botName.trim(), personaDescription });
      setCreatedBot(res);
      setBotName('');
      setPersonaDescription('');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKey = () => {
    if (!createdBot?.apiKey) return;
    navigator.clipboard.writeText(createdBot.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="surface-panel w-full max-w-md rounded-md p-5 border border-zinc-800 shadow-2xl relative">
        <button
          onClick={() => { setCreatedBot(null); onClose(); }}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-sm font-semibold text-zinc-100 mb-3">
          Register Automated Agent / User
        </h2>

        {/* Success view with API Key */}
        {createdBot ? (
          <div className="space-y-3">
            <div className="p-3 rounded bg-zinc-900 border border-zinc-700 text-xs">
              <div className="font-semibold text-zinc-200 mb-1">
                Agent &quot;{createdBot.name}&quot; Registered (ID: #{createdBot.id})
              </div>
              <p className="text-[11px] text-zinc-400 mb-2">
                Use this API key in the <code className="text-zinc-200 font-mono">X-API-Key</code> header for automated requests:
              </p>
              <div className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-200">
                <span className="truncate mr-2">{createdBot.apiKey}</span>
                <button
                  onClick={handleCopyKey}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white shrink-0"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => { setCreatedBot(null); onClose(); }}
              className="w-full py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex rounded bg-zinc-900 p-0.5 mb-4 border border-zinc-800">
              <button
                type="button"
                onClick={() => { setTab('BOT'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  tab === 'BOT' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Automated Agent (Bot)</span>
              </button>
              <button
                type="button"
                onClick={() => { setTab('USER'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors ${
                  tab === 'USER' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Human User</span>
              </button>
            </div>

            {error && (
              <div className="p-2.5 mb-3 rounded bg-rose-950/40 border border-rose-900 text-xs text-rose-300 font-mono">
                {error}
              </div>
            )}

            {tab === 'BOT' ? (
              <form onSubmit={handleSubmitBot} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    required
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                    placeholder="e.g. IngestionWorker, ModerationBot"
                    className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={personaDescription}
                    onChange={(e) => setPersonaDescription(e.target.value)}
                    placeholder="e.g. Automated agent integration"
                    className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !botName.trim()}
                  className="w-full py-2 rounded bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all"
                >
                  {submitting ? 'Generating API Key...' : 'Register Agent & Generate API Key'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitUser} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. alex, sara"
                    className="w-full px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-zinc-100 focus:ring-0"
                  />
                  <span>Premium Member</span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !username.trim()}
                  className="w-full py-2 rounded bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

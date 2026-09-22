import React, { useState } from 'react';
import { LogIn, UserPlus, X, Key, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'token'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ username: username.trim(), password });
      api.setToken(res.token);
      setSuccessMsg(`Welcome back, @${res.user.username}!`);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.register({
        username: username.trim(),
        password,
        isPremium
      });
      api.setToken(res.token);
      setSuccessMsg(`Account created! Welcome, @${res.user.username}`);
      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess(res.user, res.token);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomToken = async (e) => {
    e.preventDefault();
    if (!customToken.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.verifyToken(customToken.trim());
      if (res.valid) {
        api.setToken(customToken.trim());
        setSuccessMsg(`Custom token verified for @${res.user.username}!`);
        setTimeout(() => {
          if (onAuthSuccess) onAuthSuccess(res.user, customToken.trim());
          onClose();
        }, 700);
      } else {
        setError('Provided JWT token is invalid or expired.');
      }
    } catch (err) {
      setError(err.message || 'Invalid JWT token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-teal-500/40 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            {tab === 'login' ? (
              <LogIn className="w-5 h-5" />
            ) : tab === 'register' ? (
              <UserPlus className="w-5 h-5" />
            ) : (
              <Key className="w-5 h-5" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {tab === 'login' ? 'Sign In to Guardrails' : tab === 'register' ? 'Create an Account' : 'Custom JWT Token'}
            </h2>
            <p className="text-xs text-slate-400">
              JWT authentication with full guardrail protection
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setTab('token'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'token'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Paste Token
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-teal-950/80 border border-teal-800 text-xs text-teal-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username (e.g. lakshya)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-[0.99]"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Choose Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Unique username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Create Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0"
              />
              <span className="flex items-center gap-1">
                <span>Sign up as Premium Member</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-[0.99]"
            >
              {loading ? 'Creating Account...' : 'Create Account & Sign In'}
            </button>
          </form>
        )}

        {tab === 'token' && (
          <form onSubmit={handleApplyCustomToken} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Paste JWT Bearer Token
              </label>
              <textarea
                rows={4}
                required
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 break-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !customToken.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-[0.99]"
            >
              {loading ? 'Verifying Token...' : 'Apply JWT Token'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

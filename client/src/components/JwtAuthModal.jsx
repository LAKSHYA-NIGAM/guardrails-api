import React, { useState, useEffect } from 'react';
import { Key, X, Check, Copy, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import api, { getStoredToken, setStoredToken } from '../api';

export default function JwtAuthModal({ isOpen, onClose, onAuthChange }) {
  const [tokenInput, setTokenInput] = useState('');
  const [status, setStatus] = useState(null);
  const [decodedUser, setDecodedUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredToken();
      setTokenInput(stored);
      if (stored) {
        verify(stored);
      }
    }
  }, [isOpen]);

  const verify = async (tok) => {
    if (!tok || !tok.trim()) {
      setStatus(null);
      setDecodedUser(null);
      return;
    }
    try {
      const res = await api.verifyToken(tok.trim());
      if (res.valid) {
        setStatus('valid');
        setDecodedUser(res.user);
      } else {
        setStatus('invalid');
        setDecodedUser(null);
      }
    } catch (e) {
      setStatus('invalid');
      setDecodedUser(null);
    }
  };

  const handleSaveToken = () => {
    setStoredToken(tokenInput);
    verify(tokenInput);
    if (onAuthChange) onAuthChange(tokenInput);
    onClose();
  };

  const handleClearToken = () => {
    setStoredToken('');
    setTokenInput('');
    setStatus(null);
    setDecodedUser(null);
    if (onAuthChange) onAuthChange('');
  };

  const handleGenerateSampleToken = async () => {
    setGenerating(true);
    try {
      const res = await api.issueToken({ username: 'lakshya', id: 1, isPremium: true });
      if (res?.token) {
        setTokenInput(res.token);
        setStoredToken(res.token);
        verify(res.token);
        if (onAuthChange) onAuthChange(res.token);
      }
    } catch (e) {
      console.error('Failed to issue token', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!tokenInput) return;
    navigator.clipboard.writeText(tokenInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-cyan-500/30 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">JWT Authentication</h2>
            <p className="text-xs text-slate-400">
              Provide or manage your JWT Bearer token attached to API requests
            </p>
          </div>
        </div>

        {/* Status banner */}
        {status === 'valid' && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Valid token: <strong>@{decodedUser?.username}</strong> (ID: {decodedUser?.id})
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300">
              Active
            </span>
          </div>
        )}

        {status === 'invalid' && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Invalid or expired JWT token.</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Bearer JWT Token
              </label>
              {tokenInput && (
                <button
                  onClick={handleCopy}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                verify(e.target.value);
              }}
              placeholder="Paste your JWT token here (e.g. eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 break-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveToken}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md"
            >
              Apply Token
            </button>

            <button
              onClick={handleGenerateSampleToken}
              disabled={generating}
              className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Generate a signed token with JWT_SECRET"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>Generate Signed Token</span>
            </button>

            {tokenInput && (
              <button
                onClick={handleClearToken}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

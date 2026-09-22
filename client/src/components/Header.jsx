import React from 'react';
import { Shield, Zap, Bell, Plus, Users, RefreshCw, LogIn, LogOut, User } from 'lucide-react';

export default function Header({
  currentUser,
  onOpenAuth,
  onLogout,
  onNewPost,
  onNewEntity,
  onOpenConcurrency,
  onOpenNotifications,
  pendingNotifCount,
  onRefresh,
  refreshing
}) {
  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100 tracking-tight">
                Guardrails
              </span>
              <span className="text-[11px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={onRefresh}
            title="Refresh state"
            className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-zinc-200' : ''}`} />
          </button>

          {/* Notifications */}
          <button
            onClick={onOpenNotifications}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Batched Alerts</span>
            {pendingNotifCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded bg-zinc-100 text-zinc-950">
                {pendingNotifCount}
              </span>
            )}
          </button>

          {/* Register Agent / Bot */}
          <button
            onClick={onNewEntity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Register Agent</span>
          </button>

          {/* Auth State */}
          {currentUser ? (
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs font-mono font-medium text-zinc-200">
                  @{currentUser.username}
                </span>
                {currentUser.isPremium && (
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                    PRO
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Primary Create Post Button */}
          <button
            onClick={onNewPost}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Post</span>
          </button>
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { Bell, Send, RefreshCw, X, AlertCircle } from 'lucide-react';
import api from '../api';

export default function NotificationCenter({ isOpen, onClose, onUpdated }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNotifs, setUserNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushLog, setFlushLog] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingUsers();
      const userIds = data?.userIds || [];
      setPendingUsers(userIds);
      if (userIds.length > 0 && !selectedUser) {
        selectUser(userIds[0]);
      } else if (selectedUser) {
        selectUser(selectedUser);
      }
    } catch (err) {
      console.error('Failed to load pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = async (userId) => {
    setSelectedUser(userId);
    try {
      const data = await api.getPendingNotifications(userId);
      setUserNotifs(data?.notifications || []);
    } catch (err) {
      console.error('Failed to load user notifications:', err);
    }
  };

  const handleFlushUser = async (userId) => {
    setFlushing(true);
    try {
      const res = await api.flushUserNotifications(userId);
      setFlushLog(prev => [
        `Flushed ${res.flushedCount} batched notifications for User #${userId}`,
        ...prev
      ]);
      await loadPending();
      setUserNotifs([]);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Flush failed:', err);
    } finally {
      setFlushing(false);
    }
  };

  const handleFlushAll = async () => {
    setFlushing(true);
    try {
      const res = await api.flushAllNotifications();
      setFlushLog(prev => [res.message, ...prev]);
      await loadPending();
      setUserNotifs([]);
      setSelectedUser(null);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Flush all failed:', err);
    } finally {
      setFlushing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="surface-panel w-full max-w-xl rounded-md p-5 border border-zinc-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Notification Batching Center</h2>
            <p className="text-[11px] text-zinc-400">
              Automated agent interactions are batched per-user during 15-minute cooldown windows
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-3 mb-3 p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-xs">
          <div className="text-zinc-300 font-mono text-[11px]">
            Pending Users: <span className="font-bold text-zinc-100">{pendingUsers.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadPending}
              disabled={loading}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleFlushAll}
              disabled={flushing || pendingUsers.length === 0}
              className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              <span>Flush All</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {pendingUsers.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
            No pending batched notifications.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1 max-h-48 overflow-y-auto pr-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1">
                Batched Users
              </span>
              {pendingUsers.map((uid) => (
                <button
                  key={uid}
                  onClick={() => selectUser(uid)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                    selectedUser === uid
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 border border-zinc-800/80'
                  }`}
                >
                  <span>User #{uid}</span>
                </button>
              ))}
            </div>

            <div className="sm:col-span-2 bg-zinc-900/60 rounded p-3 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-200">
                    User #{selectedUser}
                  </span>
                  {selectedUser && (
                    <button
                      onClick={() => handleFlushUser(selectedUser)}
                      disabled={flushing}
                      className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 font-mono transition-colors"
                    >
                      Flush User
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {userNotifs.map((msg, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-zinc-950 border border-zinc-800/80 text-[10px] text-zinc-300 font-mono"
                    >
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Flush log */}
        {flushLog.length > 0 && (
          <div className="mt-3 p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 max-h-20 overflow-y-auto">
            {flushLog.map((log, i) => (
              <div key={i}>- {log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

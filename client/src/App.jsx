import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import GuardrailsInfo from './components/GuardrailsInfo';
import ConcurrencyStudio from './components/ConcurrencyStudio';
import PostCard from './components/PostCard';
import ViralityLeaderboard from './components/ViralityLeaderboard';
import CreatePostModal from './components/CreatePostModal';
import CreateEntityModal from './components/CreateEntityModal';
import NotificationCenter from './components/NotificationCenter';
import AuthModal from './components/AuthModal';
import api, { getStoredToken } from './api';
import { Layers, Activity, ShieldCheck, Zap, Plus, ArrowDown, User } from 'lucide-react';

export default function App() {
  const [posts, setPosts] = useState([]);
  const [viralPosts, setViralPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [bots, setBots] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingNotifCount, setPendingNotifCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const studioRef = useRef(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const bootstrap = async () => {
    setLoading(true);
    try {
      await loadSession();
      await loadAllData();
    } catch (err) {
      console.error('Initial load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    const token = getStoredToken();
    if (token) {
      try {
        const res = await api.getMe();
        if (res?.authenticated && res.user) {
          setCurrentUser(res.user);
        }
      } catch (err) {
        console.debug('Session check notice:', err.message);
      }
    }
  };

  const loadAllData = async () => {
    try {
      const [fetchedUsers, fetchedBots, fetchedPosts, topViral, pendingUsers] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getBots().catch(() => []),
        api.getPosts().catch(() => []),
        api.getTopViral(10).catch(() => []),
        api.getPendingUsers().catch(() => ({ pendingUserCount: 0 }))
      ]);

      setUsers(fetchedUsers || []);
      setBots(fetchedBots || []);
      setPosts(fetchedPosts || []);
      setViralPosts(topViral || []);
      setPendingNotifCount(pendingUsers?.pendingUserCount || 0);

      // Auto-seed if brand new database
      if ((!fetchedUsers || fetchedUsers.length === 0) && (!fetchedBots || fetchedBots.length === 0)) {
        await autoSeed();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const autoSeed = async () => {
    try {
      const u = await api.createUser({ username: 'lakshya', isPremium: true });
      const b = await api.createBot({
        name: 'IngestionAgent',
        personaDescription: 'Automated integration bot'
      });
      await api.createPost({
        authorId: u.id,
        authorType: 'USER',
        content: 'System initialized. Concurrency guardrails active with atomic Redis INCR throttling.'
      });
      await loadAllData();
    } catch (e) {
      console.warn('Auto-seed notice:', e.message);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    loadAllData();
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    await loadSession();
    setTimeout(() => setRefreshing(false), 400);
  };

  const scrollToStudio = () => {
    if (studioRef.current) {
      studioRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Top Navigation */}
      <Header
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onNewPost={() => setShowPostModal(true)}
        onNewEntity={() => setShowEntityModal(true)}
        onOpenConcurrency={scrollToStudio}
        onOpenNotifications={() => setShowNotificationModal(true)}
        pendingNotifCount={pendingNotifCount}
        onRefresh={handleManualRefresh}
        refreshing={refreshing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* 1. Hero / Introduction Section */}
        <section className="mb-8 pt-2 pb-4 border-b border-zinc-800/80">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-2">
              Anti-Abuse & Concurrency Guardrails
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-4">
              Production-grade anti-abuse engine with atomic Redis INCR rate throttling, interaction cooldowns, idempotency verification, and smart notification batching.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={scrollToStudio}
                className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Run Concurrency Test</span>
              </button>
              <button
                onClick={() => setShowPostModal(true)}
                className="px-4 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-colors"
              >
                Create Post
              </button>
            </div>
          </div>
        </section>

        {/* 2. Primary Concurrency Studio (Hero Demo Tool) */}
        <section ref={studioRef} className="scroll-mt-20">
          <ConcurrencyStudio
            posts={posts}
            bots={bots}
            onCompleted={loadAllData}
          />
        </section>

        {/* 3. Action-Oriented Guardrail Cards */}
        <section className="mb-8">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2.5">
            Active Guardrail Policies
          </div>
          <GuardrailsInfo onTriggerConcurrency={scrollToStudio} />
        </section>

        {/* 4. Main Feed & Virality Sidebar */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feed Column (2 Cols) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-400" />
                <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wide">
                  Live Post Stream
                </h2>
                <span className="text-[11px] font-mono text-zinc-500">
                  ({posts.length})
                </span>
              </div>

              <button
                onClick={() => setShowPostModal(true)}
                className="text-xs text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
              >
                + Write Post
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-zinc-500 text-xs font-mono">
                <Activity className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                Connecting to backend and cache...
              </div>
            ) : posts.length === 0 ? (
              <div className="surface-card rounded-md p-10 text-center text-zinc-400 text-xs">
                <p className="mb-3 font-medium text-zinc-300">No posts in the stream.</p>
                <p className="text-zinc-500 mb-4 max-w-sm mx-auto text-[11px]">
                  Create a post or run the Concurrency Studio above to initialize an isolated target post and test the 100-comment throttle.
                </p>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white"
                >
                  Create Initial Post
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser || users[0]}
                  currentBot={bots[0]}
                  onUpdate={loadAllData}
                />
              ))
            )}
          </div>

          {/* Sidebar Column (1 Col) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Virality Leaderboard */}
            <ViralityLeaderboard viralPosts={viralPosts} />

            {/* Active User Session Details (if logged in) */}
            {currentUser && (
              <div className="surface-panel rounded-md p-4 border border-zinc-800 text-xs">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-zinc-200">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
                      <span>@{currentUser.username}</span>
                      {currentUser.isPremium && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-500 text-[10px] font-mono">
                      User ID #{currentUser.id}
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-zinc-900 border border-zinc-800 flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Authenticated via Bearer JWT</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Modals */}
      <CreatePostModal
        isOpen={showPostModal}
        onClose={() => setShowPostModal(false)}
        users={users}
        bots={bots}
        currentUser={currentUser}
        onPostCreated={loadAllData}
      />

      <CreateEntityModal
        isOpen={showEntityModal}
        onClose={() => setShowEntityModal(false)}
        onCreated={loadAllData}
      />

      <NotificationCenter
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUpdated={loadAllData}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

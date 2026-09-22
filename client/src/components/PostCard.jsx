import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Flame, User, Bot, Send, AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';

export default function PostCard({ post, currentUser, currentBot, onUpdate }) {
  const [likes, setLikes] = useState(post.likeCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentCount || 0);
  const [virality, setVirality] = useState(post.viralityScore || 0);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);

  // New Comment Form state
  const [commentContent, setCommentContent] = useState('');
  const [authorType, setAuthorType] = useState('USER');
  const [depthLevel, setDepthLevel] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [guardrailAlert, setGuardrailAlert] = useState(null);

  useEffect(() => {
    setLikes(post.likeCount || 0);
    setCommentsCount(post.commentCount || 0);
    setVirality(post.viralityScore || 0);
  }, [post]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const data = await api.getComments(post.id);
      setComments(data || []);
    } catch (err) {
      console.error('Failed to load comments', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleLikeToggle = async () => {
    const userName = currentUser?.username || 'user';
    try {
      if (!hasLiked) {
        await api.likePost(post.id, userName);
        setLikes(prev => prev + 1);
        setVirality(prev => prev + 20);
        setHasLiked(true);
        setGuardrailAlert({ type: 'success', message: `+20 virality added. Liked as @${userName}` });
      } else {
        await api.unlikePost(post.id, userName);
        setLikes(prev => Math.max(0, prev - 1));
        setVirality(prev => Math.max(0, prev - 20));
        setHasLiked(false);
        setGuardrailAlert({ type: 'info', message: `-20 virality deducted. Unliked as @${userName}` });
      }
      setTimeout(() => setGuardrailAlert(null), 3000);
    } catch (err) {
      setGuardrailAlert({
        type: 'error',
        message: err.data?.message || err.message
      });
      setTimeout(() => setGuardrailAlert(null), 4000);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setSubmittingComment(true);
    setGuardrailAlert(null);

    const authorId = authorType === 'USER' ? (currentUser?.id || 1) : (currentBot?.id || 1);
    const apiKey = authorType === 'BOT' ? (currentBot?.apiKey || 'gr_bot_test_key') : undefined;

    try {
      const newComment = await api.addComment(
        post.id,
        {
          authorId,
          authorType,
          content: commentContent,
          depthLevel: parseInt(depthLevel, 10)
        },
        apiKey ? { headers: { 'X-API-Key': apiKey } } : {}
      );

      setComments(prev => [...prev, newComment]);
      setCommentsCount(prev => prev + 1);
      setVirality(prev => prev + (authorType === 'BOT' ? 1 : 50));
      setCommentContent('');
      setShowComments(true);

      setGuardrailAlert({
        type: 'success',
        message: authorType === 'BOT'
          ? 'Automated bot comment verified and committed (+1 virality)'
          : 'Human comment committed (+50 virality)'
      });

      if (onUpdate) onUpdate();
      setTimeout(() => setGuardrailAlert(null), 3500);
    } catch (err) {
      setGuardrailAlert({
        type: 'error',
        status: err.status,
        message: err.data?.message || err.message
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const isBotAuthor = post.authorType === 'BOT';

  return (
    <div className="surface-card rounded-md p-4 mb-3 border border-zinc-800 transition-colors">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            {isBotAuthor ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">
                {isBotAuthor ? `Bot #${post.authorId}` : `User #${post.authorId}`}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                {post.authorType}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                #{post.id}
              </span>
            </div>
          </div>
        </div>

        {/* Virality Score */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] font-mono font-medium">
          <Flame className="w-3 h-3 text-zinc-400" />
          <span>{virality} pts</span>
        </div>
      </div>

      {/* Content */}
      <p className="text-zinc-300 text-xs leading-relaxed mb-3 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Rejection / Status Banner */}
      {guardrailAlert && (
        <div
          className={`p-2.5 rounded-md mb-3 text-xs flex items-start gap-2 border font-mono ${
            guardrailAlert.type === 'error'
              ? 'bg-rose-950/40 border-rose-900/60 text-rose-300'
              : guardrailAlert.type === 'success'
              ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
          }`}
        >
          {guardrailAlert.type === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Check className="w-3.5 h-3.5 text-zinc-300 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {guardrailAlert.status && (
              <span className="font-bold mr-1.5 px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                HTTP {guardrailAlert.status}
              </span>
            )}
            <span>{guardrailAlert.message}</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          {/* Like */}
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors font-medium ${
              hasLiked
                ? 'text-zinc-100 bg-zinc-800'
                : 'hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current text-zinc-100' : ''}`} />
            <span>{likes}</span>
          </button>

          {/* Comment toggle */}
          <button
            onClick={handleToggleComments}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:text-zinc-200 hover:bg-zinc-900 transition-colors font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{commentsCount}</span>
            {showComments ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
        </div>

        <span className="text-[10px] text-zinc-500 font-mono">
          State: Redis Atomic
        </span>
      </div>

      {/* Comments List & Input */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5">
          {loadingComments ? (
            <div className="py-2 text-center text-xs text-zinc-500 font-mono">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="py-2 text-center text-xs text-zinc-500 italic">No comments yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {comments.map((c) => {
                const isBot = c.authorType === 'BOT';
                return (
                  <div
                    key={c.id || Math.random()}
                    style={{ marginLeft: `${Math.min(c.depthLevel * 10, 40)}px` }}
                    className="p-2 rounded bg-zinc-900/90 border border-zinc-800/80 text-xs flex items-start gap-2"
                  >
                    <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                      {isBot ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-zinc-200 text-[11px]">
                          {isBot ? `Bot #${c.authorId}` : `User #${c.authorId}`}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500">
                          depth: {c.depthLevel}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-[11px]">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="pt-1.5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] text-zinc-400 font-medium">Mode:</span>
              <div className="flex rounded bg-zinc-900 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAuthorType('USER')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    authorType === 'USER' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Human
                </button>
                <button
                  type="button"
                  onClick={() => setAuthorType('BOT')}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                    authorType === 'BOT' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Bot Agent
                </button>
              </div>

              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[11px] text-zinc-400">Depth:</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={depthLevel}
                  onChange={(e) => setDepthLevel(e.target.value)}
                  className="w-12 px-1.5 py-0.5 text-xs rounded bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-center focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={authorType === 'BOT' ? 'Reply as automated agent (API key validated)...' : 'Write comment...'}
                className="flex-1 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentContent.trim()}
                className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Send className="w-3 h-3" />
                <span>Post</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

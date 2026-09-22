import redis from '../config/redis.js';

const KEY_PREFIX = 'post:';
const KEY_SUFFIX = ':virality_score';

const BOT_REPLY_SCORE = 1;
const HUMAN_LIKE_SCORE = 20;
const HUMAN_COMMENT_SCORE = 50;

/**
 * Virality scoring service backed by Redis.
 *
 * Scoring rules:
 *   BOT_REPLY      = +1
 *   HUMAN_LIKE     = +20
 *   HUMAN_COMMENT  = +50
 *   HUMAN_UNLIKE   = -20
 *
 * Redis key: post:{postId}:virality_score
 * All increments use Redis INCRBY (atomic, thread-safe).
 */
class ViralityService {
  buildKey(postId) {
    return `${KEY_PREFIX}${postId}${KEY_SUFFIX}`;
  }

  /**
   * Increment virality score when a bot replies to a post (+1).
   * @param {number|string} postId 
   */
  async onBotReply(postId) {
    const key = this.buildKey(postId);
    const score = await redis.incrby(key, BOT_REPLY_SCORE);
    console.info(`[Virality] +${BOT_REPLY_SCORE} (BOT_REPLY) for post ${postId} → total: ${score}`);
    return score;
  }

  /**
   * Increment virality score when a human likes a post (+20).
   * @param {number|string} postId 
   */
  async onHumanLike(postId) {
    const key = this.buildKey(postId);
    const score = await redis.incrby(key, HUMAN_LIKE_SCORE);
    console.info(`[Virality] +${HUMAN_LIKE_SCORE} (HUMAN_LIKE) for post ${postId} → total: ${score}`);
    return score;
  }

  /**
   * Decrement virality score when a human unlikes a post (-20).
   * @param {number|string} postId 
   */
  async onHumanUnlike(postId) {
    const key = this.buildKey(postId);
    const score = await redis.incrby(key, -HUMAN_LIKE_SCORE);
    console.info(`[Virality] -${HUMAN_LIKE_SCORE} (HUMAN_UNLIKE) for post ${postId} → total: ${score}`);
    return score;
  }

  /**
   * Increment virality score when a human comments on a post (+50).
   * @param {number|string} postId 
   */
  async onHumanComment(postId) {
    const key = this.buildKey(postId);
    const score = await redis.incrby(key, HUMAN_COMMENT_SCORE);
    console.info(`[Virality] +${HUMAN_COMMENT_SCORE} (HUMAN_COMMENT) for post ${postId} → total: ${score}`);
    return score;
  }

  /**
   * Get current virality score for a post.
   * @param {number|string} postId 
   * @returns {Promise<number>}
   */
  async getViralityScore(postId) {
    const val = await redis.get(this.buildKey(postId));
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Get top viral posts sorted by score (descending).
   * @param {number} limit 
   * @returns {Promise<Array<{postId: number, viralityScore: number}>>}
   */
  async getTopViralPosts(limit = 10) {
    const keys = await redis.keys(`${KEY_PREFIX}*${KEY_SUFFIX}`);
    if (!keys || keys.length === 0) {
      return [];
    }

    const posts = [];
    for (const key of keys) {
      const postIdStr = key.replace(KEY_PREFIX, '').replace(KEY_SUFFIX, '');
      const val = await redis.get(key);
      const score = val ? parseInt(val, 10) : 0;
      posts.push({
        postId: parseInt(postIdStr, 10),
        viralityScore: score
      });
    }

    posts.sort((a, b) => b.viralityScore - a.viralityScore);
    return posts.slice(0, limit);
  }

  /**
   * Decay all virality scores by a factor (e.g. 0.9 = 10% decay).
   * @param {number} factor 
   */
  async decayAllScores(factor = 0.9) {
    const keys = await redis.keys(`${KEY_PREFIX}*${KEY_SUFFIX}`);
    if (!keys || keys.length === 0) return;

    for (const key of keys) {
      const val = await redis.get(key);
      if (val !== null) {
        const current = parseInt(val, 10);
        const decayed = Math.round(current * factor);
        await redis.set(key, decayed.toString());
      }
    }
    console.info(`[Virality] Decayed virality scores for ${keys.length} posts by factor ${factor}`);
  }
}

export const viralityService = new ViralityService();
export default viralityService;

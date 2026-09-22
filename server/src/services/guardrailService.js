import redis, { isRedisConnected } from '../config/redis.js';
import Comment from '../models/Comment.js';
import { GuardrailException } from '../middleware/errorHandler.js';

const BOT_COMMENT_CAP = parseInt(process.env.BOT_COMMENT_CAP || '100', 10);
const MAX_DEPTH_LEVEL = 20;
const COOLDOWN_TTL_SECONDS = parseInt(process.env.COOLDOWN_MINUTES || '10', 10) * 60; // 10 minutes (600s)

/**
 * Centralized Abuse Prevention & Concurrency Guardrail Service.
 *
 * Designed for high-throughput anti-spam throttling of automated integration agents / bots,
 * preventing thread exhaustion, post spamming, and cascade replies.
 *
 * Concurrency Safety:
 * All dynamic counter state is managed atomically via Redis single-threaded execution (INCR / DECR).
 * When Redis is offline, the service gracefully falls back to MongoDB count validation.
 */
class RedisGuardrailService {
  /**
   * Atomically increment the bot comment count for a post.
   * Enforces anti-spam throttling to prevent automated spamming.
   * If the count exceeds 100 after increment, immediately decrement (release slot)
   * and throw GuardrailException (HTTP 429).
   *
   * @param {number|string} postId
   * @returns {Promise<number>}
   */
  async incrementBotCountOrReject(postId) {
    const key = `post:${postId}:bot_count`;

    // Graceful degradation fallback if Redis is unavailable
    if (!isRedisConnected()) {
      console.warn(`[Guardrail Service] Redis unavailable. Executing degraded MongoDB count fallback for post ${postId}`);
      const count = await Comment.countDocuments({ postId: Number(postId), authorType: 'BOT' });
      if (count >= BOT_COMMENT_CAP) {
        throw new GuardrailException(`Automated spam prevention: comment limit of ${BOT_COMMENT_CAP} reached for post ${postId}`);
      }
      return count + 1;
    }

    const count = await redis.incr(key);

    if (count > BOT_COMMENT_CAP) {
      // Over cap — atomically release slot and reject
      await redis.decr(key);
      console.warn(`[Guardrail Service] Automated bot spam throttle triggered for post ${postId}. Count: ${count}`);
      throw new GuardrailException(`Automated spam prevention: comment limit of ${BOT_COMMENT_CAP} reached for post ${postId}`);
    }

    console.info(`[Guardrail Service] Automated action #${count} verified and committed for post ${postId}`);
    return count;
  }

  /**
   * Reject if comment depth exceeds maximum allowed level (20).
   * Pure validation guard — stateless.
   *
   * @param {number} depthLevel
   */
  checkDepthOrReject(depthLevel) {
    if (depthLevel > MAX_DEPTH_LEVEL) {
      console.warn(`[Guardrail Service] Comment depth ${depthLevel} exceeds maximum allowed depth ${MAX_DEPTH_LEVEL}`);
      throw new GuardrailException(
        `Comment depth level ${depthLevel} exceeds maximum allowed depth of ${MAX_DEPTH_LEVEL}`
      );
    }
  }

  /**
   * Check if a bot-human cooldown is active.
   * If the cooldown key exists in Redis, reject with 429.
   * Otherwise, set the key with a 10-minute TTL atomically using SET NX EX.
   *
   * @param {number|string} botId
   * @param {number|string} humanId
   */
  async checkBotHumanCooldownOrReject(botId, humanId) {
    if (!isRedisConnected()) {
      console.warn('[Guardrail Service] Redis unavailable. Skipping cooldown check in degraded mode.');
      return;
    }

    const key = `cooldown:bot:${botId}:human:${humanId}`;
    
    // SET key value EX seconds NX -> returns 'OK' if set, null if key already existed
    const wasSet = await redis.set(key, '1', 'EX', COOLDOWN_TTL_SECONDS, 'NX');

    if (!wasSet) {
      console.warn(`[Guardrail Service] Bot-human cooldown active: bot=${botId}, human=${humanId}`);
      throw new GuardrailException(
        `Interaction throttle active: Bot ${botId} cannot interact with Human ${humanId}'s post for another 10 minutes`
      );
    }

    console.debug(`[Guardrail Service] Bot-human cooldown set: bot=${botId}, human=${humanId}, ttl=${COOLDOWN_TTL_SECONDS}s`);
  }
}

export const guardrailService = new RedisGuardrailService();
export default guardrailService;

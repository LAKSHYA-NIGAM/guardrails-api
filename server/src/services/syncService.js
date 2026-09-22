import redis, { isRedisConnected } from '../config/redis.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';

/**
 * Service to synchronize and rebuild in-memory counters from MongoDB.
 *
 * PRODUCTION ARCHITECTURE NOTE:
 * When Redis restarts, in-memory counters can reset to 0 unless Redis AOF/RDB persistence
 * is enabled. In enterprise architectures, this is handled via:
 *   1. Redis Persistence (Append-Only File fsync policy)
 *   2. CDC (Change Data Capture) via Debezium / Kafka event streams
 *   3. Lazy Counter Warmup on post fetch if key is missing
 *
 * This sync routine provides a cold-start recovery mechanism on startup.
 */
class SyncService {
  /**
   * Rebuild counters for all posts from MongoDB persistent storage.
   */
  async rebuildCountersFromDb() {
    if (!isRedisConnected()) {
      console.warn('[SyncService] Redis is offline. Skipping startup counter sync.');
      return;
    }

    try {
      console.log('[SyncService] Starting cold-start counter reconciliation from MongoDB...');
      const posts = await Post.find({}, { id: 1 });

      let syncedCount = 0;
      for (const post of posts) {
        const postId = post.id;

        // Check if Redis key already exists
        const exists = await redis.exists(`post:${postId}:bot_count`);
        if (!exists) {
          const [botCount, totalComments, totalLikes] = await Promise.all([
            Comment.countDocuments({ postId, authorType: 'BOT' }),
            Comment.countDocuments({ postId }),
            Like.countDocuments({ postId })
          ]);

          const pipeline = redis.pipeline();
          pipeline.set(`post:${postId}:bot_count`, botCount.toString());
          pipeline.set(`post:${postId}:comments`, totalComments.toString());
          pipeline.set(`post:${postId}:likes`, totalLikes.toString());
          // Initialize virality if missing (1 bot comment = 1 pt, human like = 20 pts, comment = 50 pts)
          const humanComments = totalComments - botCount;
          const estimatedVirality = (botCount * 1) + (totalLikes * 20) + (humanComments * 50);
          pipeline.setnx(`post:${postId}:virality_score`, estimatedVirality.toString());

          await pipeline.exec();
          syncedCount++;
        }
      }

      console.log(`[SyncService] Completed counter reconciliation. Warmed up ${syncedCount} posts in Redis.`);
    } catch (err) {
      console.error('[SyncService] Error reconciling counters from MongoDB:', err.message);
    }
  }
}

export const syncService = new SyncService();
export default syncService;

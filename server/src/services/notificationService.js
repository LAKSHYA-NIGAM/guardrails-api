import redis from '../config/redis.js';

const COOLDOWN_TTL_SECONDS = parseInt(process.env.NOTIFICATION_COOLDOWN_MINUTES || '15', 10) * 60; // 15 min (900s)
const COOLDOWN_PREFIX = 'user:';
const COOLDOWN_SUFFIX = ':notif_cooldown';
const PENDING_SUFFIX = ':pending_notifs';
const PENDING_USERS_KEY = 'users:pending_notif_users';

/**
 * Smart notification batching service backed by Redis.
 *
 * When a bot interacts with a user's post:
 * - If user has NO cooldown → send immediately (log) and set 15-min cooldown
 * - If user HAS cooldown  → batch into per-user pending list for later flush
 *
 * Redis keys:
 *   user:{userId}:notif_cooldown       — STRING with 15-min TTL
 *   user:{userId}:pending_notifs       — LIST of batched messages
 *   users:pending_notif_users          — SET of userIds with pending notifs
 */
class NotificationService {
  /**
   * Handle a bot-to-user notification with smart batching.
   * @param {number|string} userId 
   * @param {string} message 
   */
  async notifyUser(userId, message) {
    const cooldownKey = `${COOLDOWN_PREFIX}${userId}${COOLDOWN_SUFFIX}`;
    const cooldownExists = await redis.exists(cooldownKey);

    if (!cooldownExists) {
      // No cooldown — send immediately and set cooldown
      console.info(`[Notification] Push Notification Sent to User: ${message}`);
      await redis.set(cooldownKey, '1', 'EX', COOLDOWN_TTL_SECONDS);
    } else {
      // Cooldown active — batch notification
      const pendingKey = `${COOLDOWN_PREFIX}${userId}${PENDING_SUFFIX}`;
      await redis.rpush(pendingKey, message);
      await redis.sadd(PENDING_USERS_KEY, userId.toString());
      console.debug(`[Notification] Batched notification for user ${userId}: ${message}`);
    }
  }

  /**
   * Flush all pending notifications for a specific user.
   * @param {number|string} userId 
   * @returns {Promise<string[]>}
   */
  async flushUserNotifications(userId) {
    const pendingKey = `${COOLDOWN_PREFIX}${userId}${PENDING_SUFFIX}`;
    const notifications = await redis.lrange(pendingKey, 0, -1);

    if (!notifications || notifications.length === 0) {
      return [];
    }

    // Clear user's pending list
    await redis.del(pendingKey);
    // Remove user from pending users set
    await redis.srem(PENDING_USERS_KEY, userId.toString());

    console.info(`[Notification] Flushed ${notifications.length} pending notifications for user ${userId}`);
    notifications.forEach((n) => console.info(`  → ${n}`));

    return notifications;
  }

  /**
   * Flush pending notifications for ALL users who have batched messages.
   */
  async flushAllPendingNotifications() {
    const userIds = await redis.smembers(PENDING_USERS_KEY);
    if (!userIds || userIds.length === 0) {
      return;
    }

    for (const userIdStr of userIds) {
      const userId = parseInt(userIdStr, 10);
      const notifications = await this.flushUserNotifications(userId);
      if (notifications.length > 0) {
        console.info(`[Notification] Push Notification Sent to User: [BATCH] ${notifications.length} notifications for user ${userId}`);
      }
    }
  }

  /**
   * Get count of pending notifications for a specific user.
   * @param {number|string} userId 
   * @returns {Promise<number>}
   */
  async getPendingCount(userId) {
    const pendingKey = `${COOLDOWN_PREFIX}${userId}${PENDING_SUFFIX}`;
    const size = await redis.llen(pendingKey);
    return size || 0;
  }

  /**
   * Get all user IDs that have pending notifications.
   * @returns {Promise<string[]>}
   */
  async getPendingUserIds() {
    const userIds = await redis.smembers(PENDING_USERS_KEY);
    return userIds || [];
  }

  /**
   * Peek at pending notifications for a user without removing them.
   * @param {number|string} userId 
   * @returns {Promise<string[]>}
   */
  async peekNotifications(userId) {
    const pendingKey = `${COOLDOWN_PREFIX}${userId}${PENDING_SUFFIX}`;
    const notifications = await redis.lrange(pendingKey, 0, -1);
    return notifications || [];
  }
}

export const notificationService = new NotificationService();
export default notificationService;

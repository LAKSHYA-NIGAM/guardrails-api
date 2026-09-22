import redis from '../config/redis.js';

const PENDING_USERS_KEY = 'users:pending_notif_users';
let sweeperInterval = null;

/**
 * Scheduled sweeper that runs every 5 minutes to flush batched notifications.
 *
 * For each user with pending notifications:
 * 1. Read all messages from user:{id}:pending_notifs
 * 2. Log a summarized push notification
 * 3. Delete the Redis list
 * 4. Remove user from users:pending_notif_users
 */
export async function sweepPendingNotifications() {
  try {
    const userIds = await redis.smembers(PENDING_USERS_KEY);

    if (!userIds || userIds.length === 0) {
      return;
    }

    console.info(`[NotificationSweeper] Started — ${userIds.length} users with pending notifications`);

    for (const userIdStr of userIds) {
      const pendingKey = `user:${userIdStr}:pending_notifs`;

      // 1. Read all messages from the user's pending list
      const messages = await redis.lrange(pendingKey, 0, -1);

      if (messages && messages.length > 0) {
        // 2. Log summarized push notification
        const firstMessage = messages[0];
        const othersCount = messages.length - 1;

        if (othersCount > 0) {
          console.info(
            `[NotificationSweeper] Summarized Push Notification: ${firstMessage} and ${othersCount} others interacted with your posts.`
          );
        } else {
          console.info(`[NotificationSweeper] Summarized Push Notification: ${firstMessage}`);
        }

        // 3. Delete the Redis list
        await redis.del(pendingKey);
      }

      // 4. Remove user from pending users set
      await redis.srem(PENDING_USERS_KEY, userIdStr);
    }

    console.info('[NotificationSweeper] Complete');
  } catch (err) {
    console.error('[NotificationSweeper] Error sweeping notifications:', err.message);
  }
}

export function startNotificationSweeper(intervalMs = 300000) {
  if (sweeperInterval) clearInterval(sweeperInterval);
  sweeperInterval = setInterval(sweepPendingNotifications, intervalMs);
  console.info(`[NotificationSweeper] Initialized (interval: ${intervalMs}ms)`);
}

export function stopNotificationSweeper() {
  if (sweeperInterval) clearInterval(sweeperInterval);
}

export default { startNotificationSweeper, stopNotificationSweeper, sweepPendingNotifications };

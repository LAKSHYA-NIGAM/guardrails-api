import notificationService from '../services/notificationService.js';

export async function getPendingNotifications(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const notifications = await notificationService.peekNotifications(userId);
    const count = await notificationService.getPendingCount(userId);
    return res.status(200).json({
      userId,
      count,
      notifications
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllPendingUsers(req, res, next) {
  try {
    const userIds = await notificationService.getPendingUserIds();
    return res.status(200).json({
      pendingUserCount: userIds.length,
      userIds
    });
  } catch (err) {
    next(err);
  }
}

export async function flushUserNotifications(req, res, next) {
  try {
    const userId = Number(req.params.userId);
    const flushed = await notificationService.flushUserNotifications(userId);
    return res.status(200).json({
      userId,
      flushedCount: flushed.length,
      notifications: flushed
    });
  } catch (err) {
    next(err);
  }
}

export async function flushAllNotifications(req, res, next) {
  try {
    const userIds = await notificationService.getPendingUserIds();
    await notificationService.flushAllPendingNotifications();
    return res.status(200).json({
      message: `Flushed notifications for ${userIds.length} users`,
      userIds
    });
  } catch (err) {
    next(err);
  }
}

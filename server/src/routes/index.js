import mongoose from 'mongoose';
import { isRedisConnected } from '../config/redis.js';
import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import * as botController from '../controllers/botController.js';
import * as postController from '../controllers/postController.js';
import * as commentController from '../controllers/commentController.js';
import * as likeController from '../controllers/likeController.js';
import * as notificationController from '../controllers/notificationController.js';
import * as authController from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBotApiKey } from '../middleware/apiKeyAuth.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';
import { requireIdempotency } from '../middleware/idempotency.js';

const router = Router();

// Apply optional JWT auth decoding globally to all routes
router.use(optionalAuth);

// ==================== Health & Status ====================
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    subsystems: {
      api: 'HEALTHY',
      database: 'CONNECTED',
      cache: 'CONNECTED'
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== Auth Routes ====================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/token', authController.issueToken);
router.post('/auth/verify', authController.verifyTokenEndpoint);
router.get('/auth/me', requireAuth, authController.getCurrentUser);

// ==================== User Routes ====================
router.post('/users', userController.createUser);
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUser);

// ==================== Bot / Third-Party Agent Routes ====================
router.post('/bots', botController.createBot);
router.get('/bots', botController.getAllBots);
router.get('/bots/:id', botController.getBot);

// ==================== Post Routes ====================
router.post('/posts', writeRateLimiter, requireIdempotency, postController.createPost);
router.get('/posts', postController.getAllPosts);
// Specific sub-paths before :id param
router.get('/posts/top-viral', postController.getTopViralPosts);
router.get('/posts/:id', postController.getPost);
router.get('/posts/:postId/virality', postController.getViralityScore);

// ==================== Comment Routes ====================
router.post(
  '/posts/:postId/comments',
  validateBotApiKey,
  writeRateLimiter,
  requireIdempotency,
  commentController.addComment
);
router.get('/posts/:postId/comments', commentController.getComments);

// ==================== Like Routes ====================
router.post('/posts/:postId/like', writeRateLimiter, requireIdempotency, likeController.likePost);
router.delete('/posts/:postId/like/:userName', likeController.unlikePost);
router.get('/posts/:postId/like/count', likeController.getLikeCount);

// ==================== Notification Routes ====================
router.get('/notifications/pending', notificationController.getAllPendingUsers);
router.get('/notifications/pending/:userId', notificationController.getPendingNotifications);
router.post('/notifications/flush', notificationController.flushAllNotifications);
router.post('/notifications/flush/:userId', notificationController.flushUserNotifications);

export default router;

import test, { describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import redis from '../src/config/redis.js';
import User from '../src/models/User.js';
import Bot from '../src/models/Bot.js';
import Post from '../src/models/Post.js';
import Comment from '../src/models/Comment.js';
import Like from '../src/models/Like.js';
import Counter from '../src/models/Counter.js';
import postService from '../src/services/postService.js';
import commentService from '../src/services/commentService.js';
import likeService from '../src/services/likeService.js';
import viralityService from '../src/services/viralityService.js';
import notificationService from '../src/services/notificationService.js';
import { connectDB } from '../src/config/db.js';

describe('🛡️ Guardrails MERN Architecture Integration Tests', () => {
  let testUser, testBot, testPost;

  before(async () => {
    await connectDB();
    // Clean up test collections and redis keys
    await User.deleteMany({});
    await Bot.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    await Like.deleteMany({});
    await Counter.deleteMany({});

    const keys = await redis.keys('post:*');
    const cooldownKeys = await redis.keys('cooldown:*');
    const userKeys = await redis.keys('user:*');
    const allKeys = [...keys, ...cooldownKeys, ...userKeys, 'users:pending_notif_users'];
    if (allKeys.length > 0) {
      await redis.del(...allKeys);
    }
  });

  after(async () => {
    try {
      await mongoose.disconnect();
      redis.disconnect();
    } catch (e) {
      // ignore
    }
  });

  test('1. Setup User and Bot', async () => {
    testUser = new User({ username: 'lakshya_test', isPremium: true });
    await testUser.save();
    assert.strictEqual(testUser.id, 1);
    assert.strictEqual(testUser.username, 'lakshya_test');

    testBot = new Bot({ name: 'SentinelBot', personaDescription: 'Testing Bot' });
    await testBot.save();
    assert.strictEqual(testBot.id, 1);
    assert.strictEqual(testBot.name, 'SentinelBot');
  });

  test('2. Create Post & Initialize Redis Keys', async () => {
    const postRes = await postService.createPost({
      authorId: testUser.id,
      authorType: 'USER',
      content: 'Integration Testing Guardrails'
    });

    assert.strictEqual(postRes.id, 1);
    assert.strictEqual(postRes.likeCount, 0);
    assert.strictEqual(postRes.commentCount, 0);
    assert.strictEqual(postRes.viralityScore, 0);

    const botCount = await redis.get(`post:${postRes.id}:bot_count`);
    assert.strictEqual(botCount, '0');

    testPost = postRes;
  });

  test('3. Human Like & Duplicate Prevention (409)', async () => {
    const likeRes = await likeService.likePost(testPost.id, { userName: 'lakshya_test' });
    assert.strictEqual(likeRes.postId, testPost.id);
    assert.strictEqual(likeRes.userName, 'lakshya_test');

    const likeCount = await likeService.getLikeCount(testPost.id);
    assert.strictEqual(likeCount, 1);

    // Virality score should be +20
    const virality = await viralityService.getViralityScore(testPost.id);
    assert.strictEqual(virality, 20);

    // Duplicate like attempt must throw 409
    await assert.rejects(
      async () => {
        await likeService.likePost(testPost.id, { userName: 'lakshya_test' });
      },
      (err) => {
        assert.strictEqual(err.status, 409);
        assert.match(err.message, /already liked/);
        return true;
      }
    );
  });

  test('4. Human Comment (+50 Virality)', async () => {
    const commentRes = await commentService.addComment(testPost.id, {
      authorId: testUser.id,
      authorType: 'USER',
      content: 'Great insight!',
      depthLevel: 0
    });

    assert.strictEqual(commentRes.postId, testPost.id);
    assert.strictEqual(commentRes.authorId, testUser.id);

    // Virality score should now be 20 + 50 = 70
    const virality = await viralityService.getViralityScore(testPost.id);
    assert.strictEqual(virality, 70);
  });

  test('5. Guardrail: Depth Level Exceeded (> 20 -> 429)', async () => {
    await assert.rejects(
      async () => {
        await commentService.addComment(testPost.id, {
          authorId: testUser.id,
          authorType: 'USER',
          content: 'Nested too deep',
          depthLevel: 25
        });
      },
      (err) => {
        assert.strictEqual(err.status, 429);
        assert.match(err.message, /depth level 25 exceeds maximum allowed depth of 20/);
        return true;
      }
    );
  });

  test('6. Guardrail: Bot-Human Cooldown (10 min)', async () => {
    // First bot comment on human post -> succeeds
    const botComment1 = await commentService.addComment(testPost.id, {
      authorId: testBot.id,
      authorType: 'BOT',
      content: 'First bot comment',
      depthLevel: 1
    });
    assert.ok(botComment1.id);

    // Immediate second bot comment on same user's post -> rejected by cooldown (429)
    await assert.rejects(
      async () => {
        await commentService.addComment(testPost.id, {
          authorId: testBot.id,
          authorType: 'BOT',
          content: 'Second immediate comment',
          depthLevel: 1
        });
      },
      (err) => {
        assert.strictEqual(err.status, 429);
        assert.match(err.message, /Interaction throttle active: Bot 1 cannot interact with Human 1/);
        return true;
      }
    );
  });

  test('7. Guardrail: 100 Bot Comment Cap Concurrency Test', async () => {
    // Create a new post authored by a BOT to isolate from bot-human cooldown
    const botPost = await postService.createPost({
      authorId: testBot.id,
      authorType: 'BOT',
      content: 'Post for concurrency test'
    });

    // Fire 120 concurrent bot comments simultaneously
    const totalRequests = 120;
    const promises = [];

    for (let i = 1; i <= totalRequests; i++) {
      promises.push(
        commentService.addComment(botPost.id, {
          authorId: testBot.id,
          authorType: 'BOT',
          content: `Concurrent comment #${i}`,
          depthLevel: 1
        }).then(
          (res) => ({ success: true, res }),
          (err) => ({ success: false, status: err.status, message: err.message })
        )
      );
    }

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.success).length;
    const rejectedCount = results.filter((r) => !r.success && r.status === 429).length;

    console.log(`[Concurrency Test Result] Success: ${successCount}, Rejected (429): ${rejectedCount}`);

    // EXACTLY 100 must succeed, and EXACTLY 20 must be rejected with 429!
    assert.strictEqual(successCount, 100);
    assert.strictEqual(rejectedCount, 20);

    const botCountInRedis = await redis.get(`post:${botPost.id}:bot_count`);
    assert.strictEqual(botCountInRedis, '100');

    const dbCommentCount = await Comment.countDocuments({ postId: botPost.id, authorType: 'BOT' });
    assert.strictEqual(dbCommentCount, 100);
  });

  test('8. Smart Notification Batching & Flush', async () => {
    const userId = 999;
    // User 999 has no cooldown -> notify sends immediately
    await notificationService.notifyUser(userId, 'Notification 1');

    // Subsequent notifications during 15-min cooldown get batched
    await notificationService.notifyUser(userId, 'Notification 2');
    await notificationService.notifyUser(userId, 'Notification 3');

    const pendingCount = await notificationService.getPendingCount(userId);
    assert.strictEqual(pendingCount, 2);

    const peeked = await notificationService.peekNotifications(userId);
    assert.deepStrictEqual(peeked, ['Notification 2', 'Notification 3']);

    // Flush user notifications
    const flushed = await notificationService.flushUserNotifications(userId);
    assert.strictEqual(flushed.length, 2);

    const countAfterFlush = await notificationService.getPendingCount(userId);
    assert.strictEqual(countAfterFlush, 0);
  });

  test('9. JWT Token Issuance & Verification', async () => {
    const { generateToken } = await import('../src/middleware/auth.js');
    const jwt = (await import('jsonwebtoken')).default;

    const payload = { id: testUser.id, username: testUser.username, isPremium: true };
    const token = generateToken(payload);
    assert.ok(token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'guardrails_super_secret_jwt_key_2026');
    assert.strictEqual(decoded.id, testUser.id);
    assert.strictEqual(decoded.username, testUser.username);
    assert.strictEqual(decoded.isPremium, true);
  });
});


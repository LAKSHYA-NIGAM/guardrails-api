import redis from '../config/redis.js';
import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Bot from '../models/Bot.js';
import guardrailService from './guardrailService.js';
import viralityService from './viralityService.js';
import notificationService from './notificationService.js';
import { NotFoundException, ValidationException } from '../middleware/errorHandler.js';

class CommentService {
  /**
   * Validate that author exists in MongoDB.
   * @param {number} authorId 
   * @param {string} authorType 
   */
  async validateAuthorExists(authorId, authorType) {
    if (authorType === 'USER') {
      const user = await User.findOne({ id: authorId });
      if (!user) {
        throw new NotFoundException(`User not found with id: ${authorId}`);
      }
    } else if (authorType === 'BOT') {
      const bot = await Bot.findOne({ id: authorId });
      if (!bot) {
        throw new NotFoundException(`Bot not found with id: ${authorId}`);
      }
    } else {
      throw new ValidationException(`Invalid authorType: ${authorType}`);
    }
  }

  /**
   * Add a comment to a post with full guardrail enforcement.
   *
   * Flow:
   * 1. Validate post and author exist
   * 2. Run Redis guardrails (depth check, bot cap atomic INCR, bot-human cooldown)
   * 3. Only after all guardrails pass → save comment to MongoDB
   * 4. Increment comment counter, update virality, queue notification
   *
   * @param {number|string} postId 
   * @param {Object} request 
   */
  async addComment(postId, request) {
    const numericPostId = Number(postId);
    const post = await Post.findOne({ id: numericPostId });
    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    if (!request.authorId || !request.authorType || !request.content) {
      throw new ValidationException('authorId, authorType, and content are required');
    }

    await this.validateAuthorExists(request.authorId, request.authorType);

    const depth = request.depthLevel !== undefined && request.depthLevel !== null ? Number(request.depthLevel) : 0;

    // --- GUARDRAIL 1: Depth level check ---
    guardrailService.checkDepthOrReject(depth);

    // --- GUARDRAIL 2: Bot-specific guardrails ---
    if (request.authorType === 'BOT') {
      // Bot comment cap (atomic INCR — exactly 100 allowed)
      await guardrailService.incrementBotCountOrReject(numericPostId);

      // Bot-human cooldown (if post author is a USER)
      if (post.authorType === 'USER') {
        try {
          await guardrailService.checkBotHumanCooldownOrReject(request.authorId, post.authorId);
        } catch (err) {
          // If cooldown check fails after bot cap increment, decrement back to keep count accurate
          await redis.decr(`post:${numericPostId}:bot_count`);
          throw err;
        }
      }
    }

    // --- DATABASE TRANSACTION (only after all Redis guardrails pass) ---
    const comment = new Comment({
      postId: numericPostId,
      authorId: request.authorId,
      authorType: request.authorType,
      content: request.content,
      depthLevel: depth
    });

    await comment.save();
    console.info(`[Comment] Saved comment ${comment.id} for post ${numericPostId}`);

    // --- POST-SAVE: Update Redis state ---
    await redis.incr(`post:${numericPostId}:comments`);

    // Update virality score based on author type
    if (request.authorType === 'BOT') {
      await viralityService.onBotReply(numericPostId);
    } else {
      await viralityService.onHumanComment(numericPostId);
    }

    // Notify post owner if bot commented on human's post
    if (request.authorType === 'BOT' && post.authorType === 'USER') {
      await notificationService.notifyUser(
        post.authorId,
        `Bot ${request.authorId} commented on your post ${numericPostId}`
      );
    }

    return this.mapToResponse(comment);
  }

  /**
   * Get all comments for a post.
   * @param {number|string} postId 
   */
  async getCommentsByPostId(postId) {
    const numericPostId = Number(postId);
    const postExists = await Post.exists({ id: numericPostId });
    if (!postExists) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    const comments = await Comment.find({ postId: numericPostId }).sort({ createdAt: 1 });
    return comments.map(this.mapToResponse);
  }

  mapToResponse(comment) {
    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorType: comment.authorType,
      content: comment.content,
      depthLevel: comment.depthLevel,
      createdAt: comment.createdAt
    };
  }
}

export const commentService = new CommentService();
export default commentService;

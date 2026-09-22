import redis from '../config/redis.js';
import Like from '../models/Like.js';
import Post from '../models/Post.js';
import viralityService from './viralityService.js';
import { DuplicateLikeException, NotFoundException, ValidationException } from '../middleware/errorHandler.js';

class LikeService {
  /**
   * Like a post. Rejects duplicate likes via unique compound index and pre-check.
   * @param {number|string} postId 
   * @param {Object} request 
   */
  async likePost(postId, request) {
    const numericPostId = Number(postId);
    const postExists = await Post.exists({ id: numericPostId });
    if (!postExists) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    if (!request.userName) {
      throw new ValidationException('userName is required');
    }

    // Check for duplicate like
    const existing = await Like.findOne({ postId: numericPostId, userName: request.userName });
    if (existing) {
      throw new DuplicateLikeException(`User ${request.userName} has already liked post ${postId}`);
    }

    const like = new Like({
      postId: numericPostId,
      userName: request.userName
    });

    try {
      await like.save();
    } catch (err) {
      if (err.code === 11000) {
        throw new DuplicateLikeException(`User ${request.userName} has already liked post ${postId}`);
      }
      throw err;
    }

    console.info(`[Like] User ${request.userName} liked post ${postId}`);

    // Increment Redis like counter
    await redis.incr(`post:${numericPostId}:likes`);

    // Update virality score (+20 for human like)
    await viralityService.onHumanLike(numericPostId);

    return this.mapToResponse(like);
  }

  /**
   * Unlike a post.
   * @param {number|string} postId 
   * @param {string} userName 
   */
  async unlikePost(postId, userName) {
    const numericPostId = Number(postId);
    const postExists = await Post.exists({ id: numericPostId });
    if (!postExists) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    const like = await Like.findOneAndDelete({ postId: numericPostId, userName });
    if (!like) {
      throw new NotFoundException(`Like not found for user ${userName} on post ${postId}`);
    }

    console.info(`[Like] User ${userName} unliked post ${postId}`);

    // Decrement Redis like counter
    await redis.decr(`post:${numericPostId}:likes`);

    // Update virality score (-20 for human unlike)
    await viralityService.onHumanUnlike(numericPostId);
  }

  /**
   * Get like count from Redis.
   * @param {number|string} postId 
   * @returns {Promise<number>}
   */
  async getLikeCount(postId) {
    const numericPostId = Number(postId);
    const postExists = await Post.exists({ id: numericPostId });
    if (!postExists) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    const countStr = await redis.get(`post:${numericPostId}:likes`);
    return countStr ? parseInt(countStr, 10) : 0;
  }

  mapToResponse(like) {
    return {
      id: like.id,
      postId: like.postId,
      userName: like.userName,
      createdAt: like.createdAt
    };
  }
}

export const likeService = new LikeService();
export default likeService;

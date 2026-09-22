import redis from '../config/redis.js';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Bot from '../models/Bot.js';
import { NotFoundException, ValidationException } from '../middleware/errorHandler.js';

class PostService {
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
   * Create a new post and initialize Redis counters.
   * @param {Object} request 
   */
  async createPost(request) {
    if (!request.authorId || !request.authorType || !request.content) {
      throw new ValidationException('authorId, authorType, and content are required');
    }

    await this.validateAuthorExists(request.authorId, request.authorType);

    const post = new Post({
      authorId: request.authorId,
      authorType: request.authorType,
      content: request.content
    });

    await post.save();
    console.info(`[Post] Created post with id: ${post.id}`);

    // Initialize Redis counters
    const postId = post.id.toString();
    await redis.set(`post:${postId}:likes`, '0');
    await redis.set(`post:${postId}:comments`, '0');
    await redis.set(`post:${postId}:bot_count`, '0');
    await redis.set(`post:${postId}:virality_score`, '0');

    return this.mapToResponse(post, 0, 0, 0);
  }

  /**
   * Get a single post enriched with Redis counters.
   * @param {number|string} id 
   */
  async getPost(id) {
    const post = await Post.findOne({ id: Number(id) });
    if (!post) {
      throw new NotFoundException(`Post not found with id: ${id}`);
    }

    const postId = post.id.toString();
    const [likes, comments, virality] = await Promise.all([
      redis.get(`post:${postId}:likes`),
      redis.get(`post:${postId}:comments`),
      redis.get(`post:${postId}:virality_score`)
    ]);

    return this.mapToResponse(
      post,
      likes ? parseInt(likes, 10) : 0,
      comments ? parseInt(comments, 10) : 0,
      virality ? parseFloat(virality) : 0.0
    );
  }

  /**
   * Get all posts enriched with Redis counters.
   */
  async getAllPosts() {
    const posts = await Post.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      posts.map(async (post) => {
        const postId = post.id.toString();
        const [likes, comments, virality] = await Promise.all([
          redis.get(`post:${postId}:likes`),
          redis.get(`post:${postId}:comments`),
          redis.get(`post:${postId}:virality_score`)
        ]);

        return this.mapToResponse(
          post,
          likes ? parseInt(likes, 10) : 0,
          comments ? parseInt(comments, 10) : 0,
          virality ? parseFloat(virality) : 0.0
        );
      })
    );

    return enriched;
  }

  mapToResponse(post, likeCount = 0, commentCount = 0, viralityScore = 0.0) {
    return {
      id: post.id,
      authorId: post.authorId,
      authorType: post.authorType,
      content: post.content,
      createdAt: post.createdAt,
      likeCount,
      commentCount,
      viralityScore
    };
  }
}

export const postService = new PostService();
export default postService;

import postService from '../services/postService.js';
import viralityService from '../services/viralityService.js';

export async function createPost(req, res, next) {
  try {
    const post = await postService.createPost(req.body);
    return res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

export async function getAllPosts(req, res, next) {
  try {
    const posts = await postService.getAllPosts();
    return res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
}

export async function getPost(req, res, next) {
  try {
    const post = await postService.getPost(req.params.id);
    return res.status(200).json(post);
  } catch (err) {
    next(err);
  }
}

export async function getViralityScore(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const score = await viralityService.getViralityScore(postId);
    return res.status(200).json({
      postId,
      viralityScore: score
    });
  } catch (err) {
    next(err);
  }
}

export async function getTopViralPosts(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const posts = await viralityService.getTopViralPosts(limit);
    return res.status(200).json(posts);
  } catch (err) {
    next(err);
  }
}

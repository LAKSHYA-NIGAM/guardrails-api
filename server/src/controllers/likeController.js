import likeService from '../services/likeService.js';

export async function likePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const like = await likeService.likePost(postId, req.body);
    return res.status(201).json(like);
  } catch (err) {
    next(err);
  }
}

export async function unlikePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const userName = req.params.userName;
    await likeService.unlikePost(postId, userName);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function getLikeCount(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const count = await likeService.getLikeCount(postId);
    return res.status(200).json({
      postId,
      likeCount: count
    });
  } catch (err) {
    next(err);
  }
}

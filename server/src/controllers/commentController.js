import commentService from '../services/commentService.js';

export async function addComment(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const comment = await commentService.addComment(postId, req.body);
    return res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
}

export async function getComments(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const comments = await commentService.getCommentsByPostId(postId);
    return res.status(200).json(comments);
  } catch (err) {
    next(err);
  }
}

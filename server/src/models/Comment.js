import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const commentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    postId: { type: Number, required: true, index: true },
    authorId: { type: Number, required: true },
    authorType: { type: String, required: true, enum: ['USER', 'BOT'] },
    content: { type: String, required: true },
    depthLevel: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

commentSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('comment_id');
  }
  next();
});

export const Comment = mongoose.model('Comment', commentSchema);
export default Comment;

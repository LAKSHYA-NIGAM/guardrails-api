import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const postSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    authorId: { type: Number, required: true },
    authorType: { type: String, required: true, enum: ['USER', 'BOT'] },
    content: { type: String, required: true },
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

postSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('post_id');
  }
  next();
});

export const Post = mongoose.model('Post', postSchema);
export default Post;

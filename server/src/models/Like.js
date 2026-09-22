import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const likeSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    postId: { type: Number, required: true, index: true },
    userName: { type: String, required: true, trim: true },
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

likeSchema.index({ postId: 1, userName: 1 }, { unique: true });

likeSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('like_id');
  }
  next();
});

export const Like = mongoose.model('Like', likeSchema);
export default Like;

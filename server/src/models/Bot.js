import mongoose from 'mongoose';
import crypto from 'crypto';
import { getNextSequence } from './Counter.js';

const botSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    name: { type: String, required: true, trim: true },
    personaDescription: { type: String, default: '' },
    apiKey: { type: String, unique: true, index: true }
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

botSchema.pre('save', async function (next) {
  if (this.isNew) {
    if (!this.id) {
      this.id = await getNextSequence('bot_id');
    }
    if (!this.apiKey) {
      this.apiKey = `gr_bot_${crypto.randomBytes(16).toString('hex')}`;
    }
  }
  next();
});

export const Bot = mongoose.model('Bot', botSchema);
export default Bot;

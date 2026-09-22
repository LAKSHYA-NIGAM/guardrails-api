import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getNextSequence } from './Counter.js';

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, default: null },
    isPremium: { type: Boolean, default: false }
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      }
    }
  }
);

userSchema.pre('save', async function (next) {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence('user_id');
  }

  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return true; // For legacy users created without password
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
export default User;

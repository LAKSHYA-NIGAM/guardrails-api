import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get next integer sequence value for a given model
 * @param {string} name 
 * @returns {Promise<number>}
 */
export async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

export default Counter;

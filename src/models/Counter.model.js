import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Counter — utility collection for auto-incrementing sequences.
 * Used to generate application IDs in the format APP-0001.
 *
 * Usage:
 *   import { getNextSequence } from '../models/Counter.model.js';
 *   const seq = await getNextSequence('application'); // → 1, 2, 3 …
 */
const counterSchema = new Schema(
  {
    _id:  { type: String, required: true }, // sequence name e.g. 'application'
    seq:  { type: Number, default: 0 },
  },
  { versionKey: false }
);

const Counter = model('Counter', counterSchema);

/**
 * Atomically increment and return the next sequence value.
 * @param {string} name  - sequence name (e.g. 'application')
 * @returns {Promise<number>}
 */
export async function getNextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return counter.seq;
}

/**
 * Format a sequence number as an application ID string.
 * @param {number} seq
 * @returns {string}  e.g. 'APP-0042'
 */
export function formatApplicationId(seq) {
  return `APP-${String(seq).padStart(4, '0')}`;
}

export default Counter;

import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

export async function connectDB() {
  const conn = await mongoose.connect(MONGO_URI);
  console.log(`✅ MongoDB connected: ${conn.connection.host}`);
}

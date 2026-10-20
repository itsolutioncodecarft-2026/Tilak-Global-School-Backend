import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

export async function connectDB() {
  const conn = await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 10000,  // fail fast if Atlas unreachable
    socketTimeoutMS:          45000,
    maxPoolSize:              10,
    bufferCommands:           true,
  });

  console.log(`✅ MongoDB connected: ${conn.connection.host}`);

  mongoose.connection.on('disconnected', () =>
    console.warn('⚠️  MongoDB disconnected — Mongoose will auto-reconnect'));
  mongoose.connection.on('reconnected', () =>
    console.log('✅ MongoDB reconnected'));
  mongoose.connection.on('error', (err) =>
    console.error('❌ MongoDB error:', err.message));
}

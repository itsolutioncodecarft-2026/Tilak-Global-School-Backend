import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

export async function connectDB() {
  // Mongoose 6+ handles reconnection automatically via bufferCommands
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Mongoose will attempt to reconnect.');
  });

  const conn = await mongoose.connect(MONGO_URI, {
    // Prevent MongoDB ObjectId fields leaking raw buffers
    bufferCommands: true,
    maxPoolSize:    10,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
}

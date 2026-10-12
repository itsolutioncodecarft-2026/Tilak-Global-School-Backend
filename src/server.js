import app from './app.js';
import { connectDB } from './config/db.js';
import { PORT } from './config/env.js';

async function startServer() {
  try {
    // Connect to MongoDB first, then start listening
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

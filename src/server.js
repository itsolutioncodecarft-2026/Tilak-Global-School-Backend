import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app         from './app.js';
import { connectDB } from './config/db.js';
import { PORT, NODE_ENV } from './config/env.js';

// ── Resolve __dirname in ES modules ──────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Ensure uploads/ directory exists (Render ephemeral filesystem) ───────────
const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadsDir);
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`   Environment:  ${NODE_ENV}`);
    });

    // ── Keep-alive ping (prevents Render free-tier sleep) ────────────────────
    // Render spins down after 15 min of inactivity — ping every 14 min to keep awake.
    if (NODE_ENV === 'production') {
      const PING_URL = process.env.RENDER_URL || 'https://api.tilakglobalschool.com';
      setInterval(async () => {
        try {
          await fetch(`${PING_URL}/api/health`);
          console.log('💓 Keep-alive ping sent');
        } catch {
          console.log('⚠️  Keep-alive ping failed');
        }
      }, 14 * 60 * 1000); // 14 minutes
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

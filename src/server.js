import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import app           from './app.js';
import { connectDB } from './config/db.js';
import { PORT, NODE_ENV, UPLOAD_DIR, RENDER_URL } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Auto-create upload subdirectories ─────────────────────────────────────────
// Multer will throw ENOENT if these don't exist at upload time.
const UPLOAD_SUBDIRS = ['gallery', 'news', 'documents', 'media'];
for (const dir of UPLOAD_SUBDIRS) {
  const full = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`📁 Created upload directory: ${full}`);
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health`);
      console.log(`   Env:    ${NODE_ENV}`);
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n${signal} received — shutting down gracefully...`);
      server.close(() => {
        console.log('✅ HTTP server closed.');
        process.exit(0);
      });
      // Force exit if graceful close takes > 10 s
      setTimeout(() => process.exit(1), 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // ── Keep-alive ping (prevent Render free-tier from sleeping) ──────────────
    // Render spins down after 15 min inactivity — ping every 14 min to stay awake.
    if (NODE_ENV === 'production') {
      setInterval(async () => {
        try {
          await fetch(`${RENDER_URL}/api/health`);
          console.log('💓 Keep-alive ping sent');
        } catch {
          console.warn('⚠️  Keep-alive ping failed');
        }
      }, 14 * 60 * 1000);
    }

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();

import dotenv from 'dotenv';
import path   from 'path';

dotenv.config();

// ── Required vars — fail fast if missing in production ────────────────────────
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev_secret_change_in_production') {
    throw new Error('JWT_SECRET must be set to a strong secret in production.');
  }
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('127.0.0.1')) {
    throw new Error('MONGO_URI must be set to a MongoDB Atlas URI in production.');
  }
}

export const PORT         = process.env.PORT         || 5000;
export const NODE_ENV     = process.env.NODE_ENV     || 'development';
export const MONGO_URI    = process.env.MONGO_URI    || 'mongodb://127.0.0.1:27017/tilak_school';

// Comma-separated allowed origins
// Dev:  http://localhost:3000,http://localhost:3001
// Prod: https://tilakglobalschool.com,https://admin-portal.tilakglobalschool.com
export const CLIENT_URL   = process.env.CLIENT_URL   || 'http://localhost:3000,http://localhost:3001';

export const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_change_in_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Cookie domain — empty = host-only (localhost dev)
// Production: .tilakglobalschool.com  (scopes to all subdomains)
export const COOKIE_DOMAIN  = process.env.COOKIE_DOMAIN  || '';

// Upload directory — resolved to absolute path from process.cwd()
export const UPLOAD_DIR       = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 10;

// Render keep-alive ping URL
export const RENDER_URL = process.env.RENDER_URL || 'https://api.tilakglobalschool.com';

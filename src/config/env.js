import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const PORT        = process.env.PORT        || 5000;
export const NODE_ENV    = process.env.NODE_ENV    || 'development';
export const MONGO_URI   = process.env.MONGO_URI   || 'mongodb://127.0.0.1:27017/tilak_school';

// Comma-separated list of allowed origins (public site + admin panel)
// Dev:  http://localhost:3000,http://localhost:3001
// Prod: https://tilakglobalschool.in,https://admin-portal.tilakglobalschool.in
export const CLIENT_URL  = process.env.CLIENT_URL  || 'http://localhost:3000,http://localhost:3001';

export const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_change_in_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Cookie domain
// Dev:  leave blank (host-only, works for localhost)
// Prod: .tilakglobalschool.in  (leading dot = all subdomains)
export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';

// Upload directory
export const UPLOAD_DIR      = path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;

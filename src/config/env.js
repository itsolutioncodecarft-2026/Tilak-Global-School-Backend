import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const PORT        = process.env.PORT        || 5000;
export const NODE_ENV    = process.env.NODE_ENV    || 'development';
export const MONGO_URI   = process.env.MONGO_URI   || 'mongodb://127.0.0.1:27017/tilak_school';
export const CLIENT_URL  = process.env.CLIENT_URL  || 'http://localhost:3000';

export const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_change_in_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Upload directory — resolved to absolute path from project root 
export const UPLOAD_DIR      = path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;

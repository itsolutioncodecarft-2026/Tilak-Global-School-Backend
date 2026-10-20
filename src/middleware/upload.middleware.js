/**
 * Multer upload middleware factory.
 *
 * Security:
 *   - Client-supplied filenames are NEVER used
 *   - Unique crypto-random filenames prevent collisions and path-traversal
 *   - File type is validated by MIME type (not file extension)
 *   - Extension is re-derived from MIME map — never from client filename
 *   - File size is capped by MAX_FILE_SIZE_MB environment variable
 *
 * Handlers:
 *   uploadImage      - gallery images (jpg, png, webp)
 *   uploadDocument   - downloadable files (pdf, doc, docx, xls, xlsx)
 *   uploadMedia      - logo/favicon/director photo (jpg, png, svg, webp)
 *   uploadNewsImage  - news/event images (jpg, png, webp)
 *   handleUploadError - error handler middleware (place after upload)
 */
import multer from 'multer';
import path   from 'path';
import crypto from 'crypto';
import { UPLOAD_DIR, MAX_FILE_SIZE_MB } from '../config/env.js';

// MIME type to safe extension map — client filename extension is ignored
const MIME_TO_EXT = {
  'image/jpeg':       '.jpg',
  'image/png':        '.png',
  'image/webp':       '.webp',
  'image/svg+xml':    '.svg',
  'application/pdf':  '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

const IMAGE_MIMES    = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MEDIA_MIMES = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];

// Storage factory — extension derived from MIME, never from client filename
function makeStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(UPLOAD_DIR, subfolder));
    },
    filename(req, file, cb) {
      const ext  = MIME_TO_EXT[file.mimetype] || '.bin'; // fallback .bin for unknown
      const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

// File filter — MIME type validation
function makeFilter(allowedMimes) {
  return function (req, file, cb) {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `File type not allowed: ${file.mimetype}`
      ));
    }
  };
}

const maxSize = (MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

export const uploadImage = multer({
  storage:    makeStorage('gallery'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export const uploadDocument = multer({
  storage:    makeStorage('documents'),
  fileFilter: makeFilter(DOCUMENT_MIMES),
  limits:     { fileSize: maxSize },
}).single('file');

export const uploadMedia = multer({
  storage:    makeStorage('media'),
  fileFilter: makeFilter(MEDIA_MIMES),
  limits:     { fileSize: maxSize },
}).single('media');

export const uploadNewsImage = multer({
  storage:    makeStorage('news'),
  fileFilter: makeFilter(IMAGE_MIMES),
  limits:     { fileSize: maxSize },
}).single('image');

export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? `File too large. Maximum size is ${MAX_FILE_SIZE_MB || 5}MB.`
      : err.message;
    return res.status(400).json({ success: false, message: msg });
  }
  next(err);
}

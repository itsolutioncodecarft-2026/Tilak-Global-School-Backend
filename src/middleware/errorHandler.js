import { NODE_ENV } from '../config/env.js';

/**
 * Global Express error handler.
 *
 * Handles:
 *   - AppError           (operational, known statusCode)
 *   - Mongoose ValidationError
 *   - Mongoose CastError (bad ObjectId)
 *   - MongoDB duplicate key (11000)
 *   - JWT errors
 *   - Multer file errors
 *   - Generic 500 fallback
 *
 * Security rules:
 *   - Never expose stack traces in production
 *   - Never expose raw database error messages to the client
 *   - Always respond with { success, message, errors? }
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';
  let errors;

  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message    = 'Validation failed.';
    errors = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
  }

  // Mongoose CastError — bad ObjectId format
  else if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid value for '${err.path}'.`;
  }

  // MongoDB duplicate key
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message     = `A record with this ${field} already exists.`;
  }

  // JWT errors (fallback — normally caught in auth middleware)
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token. Please log in again.';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Session expired. Please log in again.';
  }

  // Multer file size exceeded
  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message    = `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.`;
  }

  // Multer unexpected file type
  else if (err instanceof Error && err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message    = err.message || 'Unexpected file field.';
  }

  // Non-operational crash — mask details in production
  if (statusCode === 500 && NODE_ENV !== 'development') {
    message = 'An unexpected error occurred. Please try again later.';
  }

  const body = { success: false, message };
  if (errors)  body.errors = errors;

  // Stack trace only in development
  if (NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  // Log unexpected 500s (not operational errors) to console
  if (statusCode === 500) {
    console.error('[Unhandled Error]', err.stack || err.message);
  }

  res.status(statusCode).json(body);
}

import { NODE_ENV } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only show stack trace in development
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
}

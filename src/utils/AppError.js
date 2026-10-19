/**
 * Custom application error with an HTTP status code.
 *
 * Usage:
 *   throw new AppError('Not found', 404);
 *   throw new AppError('Forbidden', 403);
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes from unexpected crashes
    Error.captureStackTrace(this, this.constructor);
  }
}

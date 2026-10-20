/**
 * Wraps an async route handler and forwards any thrown errors to Express's
 * next() so the global errorHandler middleware catches them.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

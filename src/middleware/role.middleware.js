/**
 * Role-Based Access Control (RBAC) middleware.
 *
 * Two modes:
 *
 * 1. requireRole(...roles)
 *    Allows access only if req.admin.role is in the provided list.
 *    Usage: router.get('/users', authenticate, requireRole('super_admin'), handler)
 *
 * 2. requirePermission(module, action)
 *    Allows access only if req.admin.permissions[module][action] === true.
 *    Usage: router.post('/news', authenticate, requirePermission('news', 'edit'), handler)
 *
 * Both return 403 Forbidden when the check fails.
 */
import { sendError } from '../utils/response.js';

/**
 * Allow only admins whose role is one of the given values.
 * @param {...string} roles - e.g. 'super_admin', 'content_editor'
 */
export function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.admin) {
      return sendError(res, { statusCode: 401, message: 'Authentication required.' });
    }
    if (!roles.includes(req.admin.role)) {
      return sendError(res, {
        statusCode: 403,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

/**
 * Allow only admins whose granular permission flag is true.
 * @param {string} module  - e.g. 'news', 'admissions', 'settings'
 * @param {string} action  - e.g. 'view', 'edit', 'publish', 'delete'
 */
export function requirePermission(module, action) {
  return function (req, res, next) {
    if (!req.admin) {
      return sendError(res, { statusCode: 401, message: 'Authentication required.' });
    }

    const granted = req.admin.permissions?.[module]?.[action] === true;

    if (!granted) {
      return sendError(res, {
        statusCode: 403,
        message: `Access denied. You do not have permission to ${action} ${module}.`,
      });
    }
    next();
  };
}

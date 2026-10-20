/**
 * Authentication middleware.
 *
 * Reads JWT from:
 *   1. httpOnly cookie 'adminToken'  (primary — set by login endpoint)
 *   2. Authorization: Bearer <token> (fallback — for API testing / mobile)
 *
 * Returns JSON on ALL failures (never HTML).
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export function authenticate(req, res, next) {
  // 1. Cookie (preferred — httpOnly, not accessible to JS)
  // 2. Bearer token header (fallback)
  const token =
    req.cookies?.adminToken ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, please login',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded; // { id, email, role, permissions }
    next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Please log in again.';
    return res.status(401).json({ success: false, message });
  }
}

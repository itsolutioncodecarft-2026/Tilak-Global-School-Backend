/**
 * Authentication middleware.
 *
 * Reads the JWT from the httpOnly cookie named 'adminToken'.
 * If valid, attaches the decoded payload to req.admin and calls next().
 * If missing or invalid, returns 401.
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import { sendError } from '../utils/response.js';

export function authenticate(req, res, next) {
  const token = req.cookies?.adminToken;

  if (!token) {
    return sendError(res, { statusCode: 401, message: 'Authentication required. Please log in.' });
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
    return sendError(res, { statusCode: 401, message });
  }
}

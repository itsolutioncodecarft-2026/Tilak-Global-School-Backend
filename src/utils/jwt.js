/**
 * JWT helpers — sign tokens and set/clear the httpOnly cookie.
 *
 * Cookie name : adminToken
 * Cookie flags: httpOnly, sameSite=strict, secure in production
 * Payload     : { id, email, role, permissions }
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } from '../config/env.js';

const COOKIE_NAME = 'adminToken';

// ── How long the cookie lives (mirrors token expiry) ─────────────────────────
function cookieMaxAgeMs() {
  const raw = JWT_EXPIRES_IN || '7d';
  // Parse simple formats: 7d, 24h, 60m, 3600s
  const match = raw.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback 7 days
  const val  = parseInt(match[1], 10);
  const unit = match[2];
  const ms   = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return val * ms[unit];
}

/**
 * Build the JWT payload from an AdminUser document.
 * Permissions are embedded so every request can be authorised without a DB hit.
 */
export function buildPayload(user) {
  return {
    id:          user._id.toString(),
    email:       user.email,
    role:        user.role,
    permissions: user.permissions?.toObject
      ? user.permissions.toObject()
      : user.permissions,
  };
}

/**
 * Sign a JWT for the given user.
 * @param {object} payload  — from buildPayload()
 * @returns {string}
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Set the adminToken httpOnly cookie on the response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure:   NODE_ENV === 'production',
    maxAge:   cookieMaxAgeMs(),
  });
}

/**
 * Clear the adminToken cookie (used on logout).
 * @param {import('express').Response} res
 */
export function clearTokenCookie(res) {
  res.cookie(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    secure:   NODE_ENV === 'production',
    maxAge:   0,
  });
}

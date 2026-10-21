/**
 * JWT helpers — sign tokens and set/clear the httpOnly cookie.
 *
 * Cookie strategy for cross-origin (Vercel frontend → Render backend):
 *   Dev:  sameSite='lax',  secure=false  — same-machine localhost, no HTTPS needed
 *   Prod: sameSite='none', secure=true   — cross-origin REQUIRES both flags together
 *
 * CRITICAL: sameSite='none' only works with secure=true.
 *           If secure=false with sameSite='none', browser silently drops the cookie.
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV, COOKIE_DOMAIN } from '../config/env.js';

const COOKIE_NAME = 'adminToken';

function getCookieOptions() {
  const isProd = NODE_ENV === 'production';
  const opts = {
    httpOnly: true,
    secure:   isProd,                      // HTTPS only in production
    sameSite: isProd ? 'none' : 'lax',     // 'none' required for cross-origin Vercel→Render
    maxAge:   7 * 24 * 60 * 60 * 1000,    // 7 days in ms
    path:     '/',
  };
  // Scope cookie to all subdomains in production (e.g. .tilakglobalschool.com)
  if (isProd && COOKIE_DOMAIN) {
    opts.domain = COOKIE_DOMAIN;
  }
  return opts;
}

export function buildPayload(user) {
  return {
    id:          user._id.toString(),
    email:       user.email,
    name:        user.name,              // needed by activityLogger
    role:        user.role,
    permissions: user.permissions?.toObject
      ? user.permissions.toObject()
      : user.permissions,
  };
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

export function clearTokenCookie(res) {
  // res.clearCookie with exact same options ensures browser removes it correctly
  res.clearCookie(COOKIE_NAME, getCookieOptions());
}

/**
 * JWT helpers — sign tokens and set/clear the httpOnly cookie.
 *
 * Cookie strategy for Vercel → Render cross-origin:
 *   Dev:  sameSite='lax',  secure=false  (localhost, same-site)
 *   Prod: sameSite='none', secure=true   (cross-origin requires both)
 *
 * CRITICAL: sameSite='none' REQUIRES secure=true.
 *           If secure=false with sameSite='none', browser silently rejects cookie.
 */
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } from '../config/env.js';

const COOKIE_NAME = 'adminToken';

const getCookieOptions = () => {
  const isProd = NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure:   isProd,           // HTTPS only in production
    sameSite: isProd ? 'none' : 'lax',  // 'none' for cross-origin Vercel→Render
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path:     '/',
    // COOKIE_DOMAIN scopes cookie to *.tilakglobalschool.com in production
    ...(isProd && process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
  };
};

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

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, getCookieOptions());
}

export function clearTokenCookie(res) {
  // Pass same options so browser knows which cookie to clear
  res.clearCookie(COOKIE_NAME, getCookieOptions());
}

/**
 * Rate limiter presets using express-rate-limit.
 *
 * loginLimiter        — 10 attempts per 15 min per IP  (brute-force protection)
 * publicFormLimiter   — 10 submissions per 15 min per IP (admission + contact forms)
 * generalApiLimiter   — 200 requests per 15 min per IP  (all API routes)
 *
 * In development the login and form limiters are raised to 200 so
 * repeated local testing does not get blocked.
 */
import rateLimit from 'express-rate-limit';
import { NODE_ENV } from '../config/env.js';

const windowMs = 15 * 60 * 1000; // 15 minutes
const isDev    = NODE_ENV === 'development';

export const loginLimiter = rateLimit({
  windowMs,
  max:             isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

export const publicFormLimiter = rateLimit({
  windowMs,
  max:             isDev ? 200 : 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many submissions. Please try again after 15 minutes.',
  },
});

export const generalApiLimiter = rateLimit({
  windowMs,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

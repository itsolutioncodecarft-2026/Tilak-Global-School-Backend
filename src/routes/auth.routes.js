/**
 * Auth routes — /api/auth
 *
 * POST /api/auth/login            Public  — login, sets httpOnly cookie
 * GET  /api/auth/me               Private — get current admin profile
 * POST /api/auth/logout           Private — clear cookie
 * POST /api/auth/change-password  Private — change own password
 */
import { Router } from 'express';
import { login, getMe, logout, changePassword } from '../controllers/auth.controller.js';
import { authenticate }       from '../middleware/auth.middleware.js';
import { validate }           from '../middleware/validate.middleware.js';
import { loginLimiter }       from '../middleware/rateLimiter.middleware.js';
import { loginSchema, changePasswordSchema } from '../validators/auth.validators.js';

const router = Router();

// POST /api/auth/login
router.post('/login',
  loginLimiter,
  validate(loginSchema),
  login
);

// GET /api/auth/me
router.get('/me',
  authenticate,
  getMe
);

// POST /api/auth/logout
router.post('/logout',
  authenticate,
  logout
);

// POST /api/auth/change-password
router.post('/change-password',
  authenticate,
  validate(changePasswordSchema),
  changePassword
);

export default router;

/**
 * Auth controller
 *
 * POST /api/auth/login            — validate credentials, set httpOnly JWT cookie
 * GET  /api/auth/me               — return current admin profile from DB
 * POST /api/auth/logout           — clear cookie + log action
 * POST /api/auth/change-password  — verify current password, set new hash
 */
import bcrypt          from 'bcryptjs';
import AdminUser       from '../models/AdminUser.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { buildPayload, signToken, setTokenCookie, clearTokenCookie } from '../utils/jwt.js';
import { logActivity } from '../utils/activityLogger.js';

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body; // validated by Zod middleware

  // 1. Find user — explicitly select passwordHash (select: false in schema)
  const user = await AdminUser.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    // Generic message — do not reveal whether email exists
    return sendError(res, {
      statusCode: 401,
      message:    'Invalid email or password.',
    });
  }

  // 2. Compare password
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return sendError(res, {
      statusCode: 401,
      message:    'Invalid email or password.',
    });
  }

  // 3. Update lastLoginAt (non-blocking — fire and forget)
  AdminUser.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec();

  // 4. Sign token and set cookie
  const payload = buildPayload(user);
  const token   = signToken(payload);
  setTokenCookie(res, token);

  // 5. Log activity
  await logActivity({
    admin:       { id: user._id.toString(), name: user.name, email: user.email },
    action:      'login',
    module:      'auth',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `${user.name} logged in`,
  });

  // 6. Respond — never send passwordHash
  const safeUser = user.toJSON(); // toJSON strips passwordHash via schema transform
  return sendSuccess(res, {
    statusCode: 200,
    message:    'Login successful.',
    data:       { user: safeUser },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  // req.admin is the JWT payload; re-fetch from DB for fresh data
  const user = await AdminUser.findById(req.admin.id);

  if (!user || !user.isActive) {
    return sendError(res, { statusCode: 401, message: 'Account not found or deactivated.' });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message:    'Profile retrieved.',
    data:       { user },
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);

  await logActivity({
    admin:  req.admin,
    action: 'logout',
    module: 'auth',
    detail: `${req.admin.email} logged out`,
  });

  return sendSuccess(res, { message: 'Logged out successfully.' });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch with passwordHash
  const user = await AdminUser.findById(req.admin.id).select('+passwordHash');
  if (!user || !user.isActive) {
    return sendError(res, { statusCode: 401, message: 'Account not found or deactivated.' });
  }

  // Verify current password
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return sendError(res, {
      statusCode: 400,
      message:    'Current password is incorrect.',
    });
  }

  // Prevent reuse of the same password
  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) {
    return sendError(res, {
      statusCode: 400,
      message:    'New password must be different from the current password.',
    });
  }

  // Hash and save
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Rotate token — issue a fresh cookie so existing sessions stay valid
  const payload = buildPayload(user);
  const token   = signToken(payload);
  setTokenCookie(res, token);

  await logActivity({
    admin:  { id: user._id.toString(), name: user.name, email: user.email },
    action: 'password_change',
    module: 'auth',
    detail: `${user.name} changed their password`,
  });

  return sendSuccess(res, { message: 'Password changed successfully.' });
});

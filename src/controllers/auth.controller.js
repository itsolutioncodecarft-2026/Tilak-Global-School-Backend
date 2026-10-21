/**
 * Auth Controller
 *
 * POST /api/auth/login            — validate credentials, set httpOnly JWT cookie
 * GET  /api/auth/me               — return current admin profile
 * POST /api/auth/logout           — clear cookie
 * POST /api/auth/change-password  — verify current password, set new hash
 */
import bcrypt           from 'bcryptjs';
import AdminUser        from '../models/AdminUser.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { buildPayload, signToken, setTokenCookie, clearTokenCookie } from '../utils/jwt.js';
import { logActivity }  from '../utils/activityLogger.js';

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Fetch user — explicitly select passwordHash (select: false in schema)
  const user = await AdminUser.findOne({ email }).select('+passwordHash');

  // Generic message — never reveal whether email exists
  if (!user || !user.isActive) {
    return sendError(res, { statusCode: 401, message: 'Invalid email or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return sendError(res, { statusCode: 401, message: 'Invalid email or password.' });
  }

  // Fire-and-forget — non-blocking lastLoginAt update
  AdminUser.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).exec();

  // Sign JWT — include name so activityLogger can use it without a DB lookup
  const payload = buildPayload(user);
  const token   = signToken(payload);
  setTokenCookie(res, token);

  // Log the login event
  await logActivity({
    admin:       { id: user._id.toString(), email: user.email, name: user.name },
    action:      'login',
    module:      'auth',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `${user.name} logged in`,
  });

  const safeUser = user.toJSON(); // toJSON strips passwordHash
  return sendSuccess(res, {
    statusCode: 200,
    message:    'Login successful.',
    data:       { user: safeUser },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  // req.admin is the decoded JWT payload — re-fetch from DB for fresh data
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
    admin:       req.admin,
    action:      'logout',
    module:      'auth',
    targetId:    req.admin.id,
    targetLabel: req.admin.email,
    detail:      `${req.admin.name || req.admin.email} logged out`,
  });

  return sendSuccess(res, { message: 'Logged out successfully.' });
});

// ── POST /api/auth/change-password ────────────────────────────────────────────
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await AdminUser.findById(req.admin.id).select('+passwordHash');
  if (!user || !user.isActive) {
    return sendError(res, { statusCode: 401, message: 'Account not found or deactivated.' });
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return sendError(res, { statusCode: 400, message: 'Current password is incorrect.' });
  }

  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) {
    return sendError(res, {
      statusCode: 400,
      message:    'New password must be different from the current password.',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  // Rotate token so existing session stays valid
  const payload = buildPayload(user);
  const token   = signToken(payload);
  setTokenCookie(res, token);

  await logActivity({
    admin:       { id: user._id.toString(), email: user.email, name: user.name },
    action:      'password_change',
    module:      'auth',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `${user.name} changed their password`,
  });

  return sendSuccess(res, { message: 'Password changed successfully.' });
});

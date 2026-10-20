/**
 * User management controller — super_admin only
 *
 * GET    /api/admin/users
 * POST   /api/admin/users
 * GET    /api/admin/users/:id
 * PUT    /api/admin/users/:id
 * DELETE /api/admin/users/:id          (soft — sets isActive: false)
 * POST   /api/admin/users/:id/reset-password
 * PATCH  /api/admin/users/:id/permissions
 */
import bcrypt from 'bcryptjs';
import AdminUser, { DEFAULT_PERMISSIONS } from '../models/AdminUser.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError, parsePagination, paginationMeta } from '../utils/response.js';
import { logActivity } from '../utils/activityLogger.js';
import { AppError } from '../utils/AppError.js';

// ── GET /api/admin/users ──────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  // Optional filters
  const filter = {};
  if (req.query.role)     filter.role     = req.query.role;
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const [users, total] = await Promise.all([
    AdminUser.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    AdminUser.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Users retrieved.',
    data:    { users },
    meta:    paginationMeta(page, limit, total),
  });
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, permissions } = req.body;

  // Check for duplicate email
  const exists = await AdminUser.findOne({ email });
  if (exists) {
    return sendError(res, { statusCode: 409, message: 'A user with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Use provided permissions or default for the role
  const resolvedPermissions = permissions ?? DEFAULT_PERMISSIONS[role] ?? {};

  const user = await AdminUser.create({
    name,
    email,
    passwordHash,
    role,
    permissions: resolvedPermissions,
    isActive:    true,
    createdBy:   req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'user_created',
    module:      'users',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `Created user ${user.name} (${user.role})`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'User created successfully.',
    data:       { user },
  });
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
export const getUser = asyncHandler(async (req, res) => {
  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  return sendSuccess(res, {
    message: 'User retrieved.',
    data:    { user },
  });
});

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────
export const updateUser = asyncHandler(async (req, res) => {
  const { name, role, isActive } = req.body;

  // Prevent super_admin from deactivating their own account
  if (req.params.id === req.admin.id && isActive === false) {
    return sendError(res, {
      statusCode: 400,
      message:    'You cannot deactivate your own account.',
    });
  }

  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  const changes = [];
  if (name     !== undefined && name     !== user.name)     { user.name = name;         changes.push('name'); }
  if (isActive !== undefined && isActive !== user.isActive) { user.isActive = isActive; changes.push('isActive'); }

  // If role changes, reset permissions to new role defaults
  if (role !== undefined && role !== user.role) {
    user.role        = role;
    user.permissions = DEFAULT_PERMISSIONS[role] ?? {};
    changes.push('role');
    changes.push('permissions (reset to role defaults)');
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes detected.', data: { user } });
  }

  await user.save();

  await logActivity({
    admin:       req.admin,
    action:      'user_updated',
    module:      'users',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, {
    message: 'User updated successfully.',
    data:    { user },
  });
});

// ── DELETE /api/admin/users/:id — soft deactivate ────────────────────────────
export const deleteUser = asyncHandler(async (req, res) => {
  // Prevent self-deletion
  if (req.params.id === req.admin.id) {
    return sendError(res, {
      statusCode: 400,
      message:    'You cannot deactivate your own account.',
    });
  }

  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  if (!user.isActive) {
    return sendError(res, { statusCode: 400, message: 'User is already inactive.' });
  }

  user.isActive = false;
  await user.save();

  await logActivity({
    admin:       req.admin,
    action:      'user_deactivated',
    module:      'users',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `Deactivated user ${user.name}`,
  });

  return sendSuccess(res, { message: 'User deactivated successfully.' });
});

// ── POST /api/admin/users/:id/reset-password ─────────────────────────────────
export const resetUserPw = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;

  const user = await AdminUser.findById(req.params.id).select('+passwordHash');
  if (!user) throw new AppError('User not found.', 404);

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  await logActivity({
    admin:       req.admin,
    action:      'password_change',
    module:      'users',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `Password reset for ${user.name} by ${req.admin.email}`,
  });

  return sendSuccess(res, { message: `Password reset for ${user.name} successfully.` });
});

// ── PATCH /api/admin/users/:id/permissions ────────────────────────────────────
export const updateUserPerms = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!permissions || typeof permissions !== 'object') {
    return sendError(res, { statusCode: 400, message: 'Permissions object is required.' });
  }

  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  // Deep merge: only overwrite the keys supplied, keep existing for the rest
  const current = user.permissions.toObject ? user.permissions.toObject() : { ...user.permissions };

  for (const [mod, actions] of Object.entries(permissions)) {
    if (current[mod] && typeof actions === 'object') {
      current[mod] = { ...current[mod], ...actions };
    } else {
      current[mod] = actions;
    }
  }

  user.permissions = current;
  await user.save();

  await logActivity({
    admin:       req.admin,
    action:      'user_updated',
    module:      'users',
    targetId:    user._id.toString(),
    targetLabel: user.email,
    detail:      `Permissions updated for ${user.name}`,
  });

  return sendSuccess(res, {
    message: 'Permissions updated successfully.',
    data:    { user },
  });
});

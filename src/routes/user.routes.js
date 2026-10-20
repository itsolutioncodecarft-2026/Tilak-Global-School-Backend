/**
 * Admin user management routes — /api/admin/users
 * All routes: authenticate + super_admin only
 *
 * GET    /api/admin/users                      — list all users
 * POST   /api/admin/users                      — create user
 * GET    /api/admin/users/:id                  — get user by id
 * PUT    /api/admin/users/:id                  — update user (name, role, isActive)
 * DELETE /api/admin/users/:id                  — deactivate user (soft)
 * POST   /api/admin/users/:id/reset-password   — admin resets another user's password
 * PATCH  /api/admin/users/:id/permissions      — override permissions for user
 */
import { Router } from 'express';
import {
  listUsers, createUser, getUser,
  updateUser, deleteUser, resetUserPw, updateUserPerms,
} from '../controllers/user.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requireRole }         from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { createUserSchema, updateUserSchema, adminResetPasswordSchema } from '../validators/user.validators.js';

const router = Router();

// All user management is super_admin only
router.use(authenticate, requireRole('super_admin'));

router.route('/')
  .get(listUsers)
  .post(validate(createUserSchema), createUser);

router.route('/:id')
  .get(getUser)
  .put(validate(updateUserSchema), updateUser)
  .delete(deleteUser);

router.post('/:id/reset-password',
  validate(adminResetPasswordSchema),
  resetUserPw
);

router.patch('/:id/permissions', updateUserPerms);

export default router;

import { z } from 'zod';

export const createUserSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(100).trim(),
  email:    z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role:     z.enum(['super_admin', 'content_editor', 'admissions_staff'], {
    errorMap: () => ({ message: 'Role must be super_admin, content_editor, or admissions_staff' }),
  }),
  // Optional: override default permissions for this role
  permissions: z.record(z.any()).optional(),
});

export const updateUserSchema = z.object({
  name:        z.string().min(1).max(100).trim().optional(),
  role:        z.enum(['super_admin', 'content_editor', 'admissions_staff']).optional(),
  isActive:    z.boolean().optional(),
  permissions: z.record(z.any()).optional(),
});

export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

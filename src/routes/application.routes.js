/**
 * Admission application routes
 *
 * ── Public (rate-limited) ────────────────────────────────────────────────────
 * POST /api/applications                        — submit enquiry or application
 *
 * ── Admin (/api/admin/applications) ─────────────────────────────────────────
 * GET   /api/admin/applications                 — list + search + filter
 *   ?search=    text search on studentName, parentName, applicationId
 *   ?status=    pending | approved | rejected | info_requested | all
 *   ?class=     Nursery | LKG | … | XII | all
 *   ?from=      ISO date – createdAt range start
 *   ?to=        ISO date – createdAt range end
 *   ?page=      page number (default 1)
 *   ?limit=     results per page (default 20, max 100)
 *
 * GET   /api/admin/applications/:id             — full detail
 * PATCH /api/admin/applications/:id/status      — update status + note
 * DELETE /api/admin/applications/:id            — hard delete (super_admin only)
 */
import { Router } from 'express';
import {
  submitApplication, listApplications,
  getApplication, updateStatus, deleteApplication,
} from '../controllers/application.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission, requireRole } from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { publicFormLimiter }   from '../middleware/rateLimiter.middleware.js';
import {
  createApplicationSchema,
  updateStatusSchema,
  applicationQuerySchema,
} from '../validators/application.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicApplicationRouter = Router();

publicApplicationRouter.post('/',
  publicFormLimiter,
  validate(createApplicationSchema),
  submitApplication
);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminApplicationRouter = Router();

adminApplicationRouter.use(authenticate);

adminApplicationRouter.get('/',
  requirePermission('admissions', 'view'),
  validate(applicationQuerySchema, 'query'),
  listApplications
);

adminApplicationRouter.get('/:id',
  requirePermission('admissions', 'view'),
  getApplication
);

adminApplicationRouter.patch('/:id/status',
  requirePermission('admissions', 'updateStatus'),
  validate(updateStatusSchema),
  updateStatus
);

adminApplicationRouter.delete('/:id',
  requireRole('super_admin'),
  deleteApplication
);

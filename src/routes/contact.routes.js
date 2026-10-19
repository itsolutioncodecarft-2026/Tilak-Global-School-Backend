/**
 * Contact enquiry routes
 *
 * ── Public (rate-limited) ────────────────────────────────────────────────────
 * POST /api/contact                        — submit contact form
 *
 * ── Admin (/api/admin/contact) ───────────────────────────────────────────────
 * GET    /api/admin/contact                — list enquiries (?status=unread|read|replied|all)
 * GET    /api/admin/contact/:id            — single enquiry
 * PATCH  /api/admin/contact/:id/status     — update status (read, replied)
 * DELETE /api/admin/contact/:id            — delete (super_admin only)
 */
import { Router } from 'express';
import {
  submitContact, listContacts, getContact,
  updateContactStatus, deleteContact,
} from '../controllers/contact.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission, requireRole }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { publicFormLimiter }   from '../middleware/rateLimiter.middleware.js';
import { createContactSchema, updateContactStatusSchema } from '../validators/contact.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicContactRouter = Router();

publicContactRouter.post('/',
  publicFormLimiter,
  validate(createContactSchema),
  submitContact
);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminContactRouter = Router();

adminContactRouter.use(authenticate, requirePermission('contactEnquiries', 'view'));

adminContactRouter.get('/',     listContacts);
adminContactRouter.get('/:id',  getContact);

adminContactRouter.patch('/:id/status',
  validate(updateContactStatusSchema),
  updateContactStatus
);

adminContactRouter.delete('/:id',
  requireRole('super_admin'),
  deleteContact
);

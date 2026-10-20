/**
 * Fee structure routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/fees               — all active fee rows (sorted by order)
 *
 * ── Admin (/api/admin/fees) ──────────────────────────────────────────────────
 * GET    /api/admin/fees        — all fee rows (incl. inactive)
 * POST   /api/admin/fees        — create row
 * PUT    /api/admin/fees/:id    — update row
 * DELETE /api/admin/fees/:id    — delete row
 */
import { Router } from 'express';
import { getPublicFees, listFees, createFee, updateFee, deleteFee } from '../controllers/fee.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { createFeeSchema, updateFeeSchema } from '../validators/fee.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicFeeRouter = Router();
publicFeeRouter.get('/', getPublicFees);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminFeeRouter = Router();

adminFeeRouter.use(authenticate);

adminFeeRouter.get('/',
  requirePermission('fees', 'view'),
  listFees
);

adminFeeRouter.post('/',
  requirePermission('fees', 'edit'),
  validate(createFeeSchema),
  createFee
);

adminFeeRouter.put('/:id',
  requirePermission('fees', 'edit'),
  validate(updateFeeSchema),
  updateFee
);

adminFeeRouter.delete('/:id',
  requirePermission('fees', 'edit'),
  deleteFee
);

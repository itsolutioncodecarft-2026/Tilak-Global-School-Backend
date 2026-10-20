/**
 * FAQ routes
 *
 * ── Public ───────────────────────────────────────────────────────────────────
 * GET /api/faqs               — active FAQs sorted by order
 *
 * ── Admin (/api/admin/faqs) ──────────────────────────────────────────────────
 * GET    /api/admin/faqs           — all FAQs (incl. inactive)
 * POST   /api/admin/faqs           — create FAQ
 * PUT    /api/admin/faqs/:id       — update FAQ
 * DELETE /api/admin/faqs/:id       — delete FAQ
 * PATCH  /api/admin/faqs/reorder   — bulk reorder (body: { items: [{id, order}] })
 */
import { Router } from 'express';
import { getPublicFaqs, listFaqs, createFaq, updateFaq, deleteFaq, reorderFaqs } from '../controllers/faq.controller.js';
import { authenticate }        from '../middleware/auth.middleware.js';
import { requirePermission }   from '../middleware/role.middleware.js';
import { validate }            from '../middleware/validate.middleware.js';
import { createFaqSchema, updateFaqSchema, reorderFaqSchema } from '../validators/faq.validators.js';

// ── Public router ─────────────────────────────────────────────────────────────
export const publicFaqRouter = Router();
publicFaqRouter.get('/', getPublicFaqs);

// ── Admin router ──────────────────────────────────────────────────────────────
export const adminFaqRouter = Router();

adminFaqRouter.use(authenticate);

// NOTE: /reorder must be declared BEFORE /:id to avoid id match
adminFaqRouter.patch('/reorder',
  requirePermission('faqs', 'edit'),
  validate(reorderFaqSchema),
  reorderFaqs
);

adminFaqRouter.get('/',
  requirePermission('faqs', 'view'),
  listFaqs
);

adminFaqRouter.post('/',
  requirePermission('faqs', 'edit'),
  validate(createFaqSchema),
  createFaq
);

adminFaqRouter.put('/:id',
  requirePermission('faqs', 'edit'),
  validate(updateFaqSchema),
  updateFaq
);

adminFaqRouter.delete('/:id',
  requirePermission('faqs', 'edit'),
  deleteFaq
);

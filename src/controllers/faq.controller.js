/**
 * FAQ Controller
 *
 * Public:
 *   GET /api/faqs           - active FAQs sorted by order
 *
 * Admin:
 *   GET    /api/admin/faqs          - all FAQs (incl. inactive)
 *   POST   /api/admin/faqs          - create
 *   PUT    /api/admin/faqs/:id      - update
 *   DELETE /api/admin/faqs/:id      - delete
 *   PATCH  /api/admin/faqs/reorder  - bulk reorder
 */
import Faq           from '../models/Faq.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/faqs
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicFaqs = asyncHandler(async (req, res) => {
  const faqs = await Faq.find({ isActive: true })
    .select('question answer order')
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'FAQs retrieved.',
    data:    { faqs, total: faqs.length },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/faqs
// ─────────────────────────────────────────────────────────────────────────────
export const listFaqs = asyncHandler(async (req, res) => {
  const faqs = await Faq.find({})
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'FAQs retrieved.',
    data:    { faqs, total: faqs.length },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/faqs
// ─────────────────────────────────────────────────────────────────────────────
export const createFaq = asyncHandler(async (req, res) => {
  const { question, answer, order, isActive } = req.body;

  const faq = await Faq.create({
    question,
    answer,
    order:    order    ?? 0,
    isActive: isActive ?? true,
    updatedBy: req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'create',
    module:      'faqs',
    targetId:    faq._id.toString(),
    targetLabel: faq.question.substring(0, 60),
    detail:      `Created FAQ: "${faq.question.substring(0, 60)}"`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'FAQ created.',
    data:       { faq },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/faqs/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.findById(req.params.id);
  if (!faq) throw new AppError('FAQ not found.', 404);

  const fields  = ['question', 'answer', 'order', 'isActive'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      faq[f] = req.body[f];
      changes.push(f);
    }
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { faq } });
  }

  faq.updatedBy = req.admin.id;
  await faq.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'faqs',
    targetId:    faq._id.toString(),
    targetLabel: faq.question.substring(0, 60),
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'FAQ updated.', data: { faq } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/faqs/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteFaq = asyncHandler(async (req, res) => {
  const faq = await Faq.findById(req.params.id);
  if (!faq) throw new AppError('FAQ not found.', 404);

  await Faq.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'faqs',
    targetId:    req.params.id,
    targetLabel: faq.question.substring(0, 60),
    detail:      `Deleted FAQ`,
  });

  return sendSuccess(res, { message: 'FAQ deleted.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/faqs/reorder
// Body: { items: [{ id, order }, ...] }
// ─────────────────────────────────────────────────────────────────────────────
export const reorderFaqs = asyncHandler(async (req, res) => {
  const { items } = req.body; // validated by Zod

  if (!Array.isArray(items) || items.length === 0) {
    return sendError(res, { statusCode: 400, message: 'items array is required.' });
  }

  // Run all updates in parallel using bulkWrite for efficiency
  const ops = items.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order, updatedBy: req.admin.id } },
    },
  }));

  const result = await Faq.bulkWrite(ops);

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'faqs',
    targetLabel: 'FAQ order',
    detail:      `Reordered ${items.length} FAQs`,
  });

  return sendSuccess(res, {
    message: `${result.modifiedCount} FAQs reordered.`,
    data:    { modifiedCount: result.modifiedCount },
  });
});

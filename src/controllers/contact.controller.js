/**
 * Contact Enquiry Controller
 *
 * Public:
 *   POST /api/contact                    - submit contact form (rate-limited)
 *
 * Admin:
 *   GET    /api/admin/contact            - list enquiries with filters + pagination
 *   GET    /api/admin/contact/:id        - single enquiry (full detail)
 *   PATCH  /api/admin/contact/:id/status - mark as read / replied
 *   DELETE /api/admin/contact/:id        - hard delete (super_admin only)
 *
 * Security:
 *   - ipAddress stored but never returned in responses
 *   - Honeypot field (_hp) rejects bot submissions at Zod validation layer
 *   - PII (email, phone) accessible only to authenticated admins
 */
import ContactEnquiry    from '../models/ContactEnquiry.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError, paginationMeta } from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  POST /api/contact
// ─────────────────────────────────────────────────────────────────────────────
export const submitContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  // _hp honeypot is validated by Zod (max 0 chars) — if filled, Zod returns 422 before here

  // Capture IP for spam tracking (never returned to clients)
  const ipAddress = req.ip
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || '';

  await ContactEnquiry.create({
    name, email,
    phone:   phone   ?? '',
    subject: subject ?? '',
    message,
    status:  'unread',
    ipAddress,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Thank you for your message. We will get back to you shortly.',
    data:       null,  // no record data returned to public
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/contact
// Supports ?status=unread|read|replied|all  ?page=  ?limit=
// ─────────────────────────────────────────────────────────────────────────────
export const listContacts = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  const statusParam = req.query.status;
  if (statusParam && statusParam !== 'all') {
    filter.status = statusParam;
  }

  // Optional search on name/email
  if (req.query.search?.trim()) {
    const re = new RegExp(req.query.search.trim(), 'i');
    filter.$or = [{ name: re }, { email: re }, { subject: re }];
  }

  const [enquiries, total] = await Promise.all([
    ContactEnquiry.find(filter)
      .select('-ipAddress')     // never expose IP in responses
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactEnquiry.countDocuments(filter),
  ]);

  // Summary counts for dashboard badge
  const [unread, read, replied] = await Promise.all([
    ContactEnquiry.countDocuments({ status: 'unread' }),
    ContactEnquiry.countDocuments({ status: 'read' }),
    ContactEnquiry.countDocuments({ status: 'replied' }),
  ]);

  return sendSuccess(res, {
    message: 'Contact enquiries retrieved.',
    data:    { enquiries, counts: { total: unread + read + replied, unread, read, replied } },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/contact/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getContact = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.findById(req.params.id)
    .select('-ipAddress')  // never expose IP
    .lean();
  if (!enquiry) throw new AppError('Enquiry not found.', 404);

  // Auto-mark as read when first viewed
  if (enquiry.status === 'unread') {
    await ContactEnquiry.findByIdAndUpdate(req.params.id, { status: 'read' });
    enquiry.status = 'read';
  }

  return sendSuccess(res, { message: 'Enquiry retrieved.', data: { enquiry } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/contact/:id/status
// ─────────────────────────────────────────────────────────────────────────────
export const updateContactStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const enquiry = await ContactEnquiry.findById(req.params.id).select('-ipAddress');
  if (!enquiry) throw new AppError('Enquiry not found.', 404);

  if (enquiry.status === status) {
    return sendError(res, {
      statusCode: 400,
      message:    `Enquiry is already marked as ${status}.`,
    });
  }

  enquiry.status = status;
  await enquiry.save();

  return sendSuccess(res, {
    message:  `Enquiry marked as ${status}.`,
    data:     { enquiry },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/contact/:id  (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteContact = asyncHandler(async (req, res) => {
  const enquiry = await ContactEnquiry.findById(req.params.id);
  if (!enquiry) throw new AppError('Enquiry not found.', 404);

  await ContactEnquiry.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'admissions',  // closest module — contact falls under this bucket
    targetId:    req.params.id,
    targetLabel: `${enquiry.name} <${enquiry.email}>`,
    detail:      `Contact enquiry deleted from ${enquiry.name}`,
  });

  return sendSuccess(res, { message: 'Contact enquiry deleted.' });
});

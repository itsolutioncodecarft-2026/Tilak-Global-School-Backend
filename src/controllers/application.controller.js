/**
 * Admission Application Controller
 *
 * Public:
 *   POST /api/applications                       — submit enquiry or application
 *
 * Admin:
 *   GET    /api/admin/applications               — list with search, filters, pagination
 *   GET    /api/admin/applications/:id           — full application detail
 *   PATCH  /api/admin/applications/:id/status    — update status + note + history
 *   DELETE /api/admin/applications/:id           — hard delete (super_admin only)
 */
import AdmissionApplication from '../models/AdmissionApplication.model.js';
import { getNextSequence, formatApplicationId } from '../models/Counter.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError, paginationMeta } from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build Mongoose filter from already-validated query params
// ─────────────────────────────────────────────────────────────────────────────
function buildFilter({ search, status, class: cls, from, to }) {
  const filter = {};

  if (status && status !== 'all') filter.status       = status;
  if (cls    && cls    !== 'all') filter.classApplying = cls;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  // Only add $text when search is a non-empty string
  if (typeof search === 'string' && search.trim().length > 0) {
    filter.$text = { $search: search.trim() };
  }

  return filter;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  POST /api/applications
// ─────────────────────────────────────────────────────────────────────────────
export const submitApplication = asyncHandler(async (req, res) => {
  const data = req.body; // already validated + coerced by Zod middleware

  const seq           = await getNextSequence('application');
  const applicationId = formatApplicationId(seq);

  const application = await AdmissionApplication.create({
    ...data,
    applicationId,
    status:        'pending',
    statusHistory: [],
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Your application has been received. We will contact you shortly.',
    data: {
      applicationId: application.applicationId,
      studentName:   application.studentName,
      classApplying: application.classApplying,
      status:        application.status,
      createdAt:     application.createdAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/applications
// ─────────────────────────────────────────────────────────────────────────────
export const listApplications = asyncHandler(async (req, res) => {
  // Use req.validatedQuery — set by validate middleware (req.query is read-only in Express)
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Number(q.limit) || 20;
  const skip  = (page - 1) * limit;

  const filter = buildFilter(q);

  // Use relevance sort when text search active, otherwise newest first
  const sortStage = filter.$text
    ? { score: { $meta: 'textScore' }, createdAt: -1 }
    : { createdAt: -1 };

  // List projection — omit PII from list view (phone/email/address)
  // Full detail only available via GET /:id
  const projection = {
    applicationId: 1,
    studentName:   1,
    classApplying: 1,
    parentName:    1,
    source:        1,
    status:        1,
    statusNote:    1,
    createdAt:     1,
    updatedAt:     1,
    ...(filter.$text && { score: { $meta: 'textScore' } }),
  };

  const [applications, total] = await Promise.all([
    AdmissionApplication.find(filter, projection)
      .sort(sortStage)
      .skip(skip)
      .limit(limit)
      .lean(),
    AdmissionApplication.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Applications retrieved.',
    data:    { applications },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/applications/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getApplication = asyncHandler(async (req, res) => {
  const application = await AdmissionApplication
    .findById(req.params.id)
    .populate('statusHistory.changedBy', 'name email role')
    .lean();

  if (!application) throw new AppError('Application not found.', 404);

  return sendSuccess(res, {
    message: 'Application retrieved.',
    data:    { application },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/applications/:id/status
// ─────────────────────────────────────────────────────────────────────────────
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) throw new AppError('Application not found.', 404);

  const previousStatus = application.status;

  if (previousStatus === status) {
    return sendError(res, {
      statusCode: 400,
      message:    `Application is already ${status}.`,
    });
  }

  application.status     = status;
  application.statusNote = note || '';
  application.statusHistory.push({
    status,
    note:      note || '',
    changedBy: req.admin.id,
    changedAt: new Date(),
  });

  await application.save();

  await logActivity({
    admin:       req.admin,
    action:      'status_change',
    module:      'admissions',
    targetId:    application.applicationId,
    targetLabel: `${application.studentName} (${application.classApplying})`,
    detail:      `${previousStatus} → ${status}${note ? ` | Note: ${note}` : ''}`,
  });

  const statusMessages = {
    approved:       'Application approved successfully.',
    rejected:       'Application rejected.',
    info_requested: 'Additional information requested.',
    pending:        'Application set back to pending.',
  };

  return sendSuccess(res, {
    message: statusMessages[status] || 'Status updated.',
    data: {
      applicationId:  application.applicationId,
      studentName:    application.studentName,
      classApplying:  application.classApplying,
      status:         application.status,
      statusNote:     application.statusNote,
      statusHistory:  application.statusHistory,
      updatedAt:      application.updatedAt,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/applications/:id  (super_admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteApplication = asyncHandler(async (req, res) => {
  const application = await AdmissionApplication.findById(req.params.id);
  if (!application) throw new AppError('Application not found.', 404);

  const { applicationId, studentName, classApplying } = application;

  await AdmissionApplication.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'admissions',
    targetId:    applicationId,
    targetLabel: `${studentName} (${classApplying})`,
    detail:      `Application ${applicationId} permanently deleted by ${req.admin.email}`,
  });

  return sendSuccess(res, {
    message: `Application ${applicationId} deleted successfully.`,
  });
});

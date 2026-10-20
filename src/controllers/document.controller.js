/**
 * Document Controller — Notices & Downloads
 *
 * Public:
 *   GET /api/documents           - published docs (?category=&docPage=&page=&limit=)
 *
 * Admin:
 *   GET    /api/admin/documents          - all docs with filters
 *   POST   /api/admin/documents          - upload file + create record
 *   GET    /api/admin/documents/:id      - single document
 *   PUT    /api/admin/documents/:id      - update metadata (+ optional file replace)
 *   DELETE /api/admin/documents/:id      - delete record + file
 */
import path from 'path';
import fs   from 'fs';
import Document, { DOCUMENT_FILE_TYPES } from '../models/Document.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, paginationMeta } from '../utils/response.js';
import { UPLOAD_DIR }    from '../config/env.js';

// Map multer mime types to our fileType enum
const MIME_TO_FILETYPE = {
  'application/pdf':                                                          'PDF',
  'application/msword':                                                       'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel':                                                'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':       'XLSX',
};

function deleteLocalFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    const filename = relativeUrl.replace('/uploads/', '');
    const absPath  = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {
    console.warn('[Document] Could not delete file:', relativeUrl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/documents
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicDocuments = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(100, Number(q.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = { status: 'published' };
  if (q.category && q.category !== 'all') filter.category = q.category;
  if (q.docPage  && q.docPage  !== 'all') filter.page     = q.docPage;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .select('title category page fileUrl fileType fileSizeKb issueDate createdAt')
      .sort({ category: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Documents retrieved.',
    data:    { documents },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/documents
// ─────────────────────────────────────────────────────────────────────────────
export const listDocuments = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(100, Number(q.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (q.category && q.category !== 'all') filter.category = q.category;
  if (q.docPage  && q.docPage  !== 'all') filter.page     = q.docPage;
  if (q.status   && q.status   !== 'all') filter.status   = q.status;

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort({ category: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Documents list retrieved.',
    data:    { documents },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/documents  (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Document file is required.' });
  }

  const { title, category, page, issueDate, status } = req.body;

  // Infer fileType from mime type
  const fileType = MIME_TO_FILETYPE[req.file.mimetype]
    || path.extname(req.file.originalname).replace('.', '').toUpperCase()
    || 'PDF';

  const fileSizeKb = Math.round(req.file.size / 1024);
  const fileUrl    = `/uploads/documents/${req.file.filename}`;

  const document = await Document.create({
    title,
    category,
    page,
    fileUrl,
    fileType,
    fileSizeKb,
    issueDate:  issueDate ? new Date(issueDate) : null,
    status:     status ?? 'published',
    uploadedBy: req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'upload',
    module:      'documents',
    targetId:    document._id.toString(),
    targetLabel: document.title,
    detail:      `Document uploaded: "${title}" (${fileType}, ${fileSizeKb}KB)`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Document uploaded successfully.',
    data:       { document },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/documents/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id).lean();
  if (!document) throw new AppError('Document not found.', 404);

  return sendSuccess(res, { message: 'Document retrieved.', data: { document } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/documents/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) throw new AppError('Document not found.', 404);

  const fields  = ['title', 'category', 'page', 'issueDate', 'status'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      document[f] = f === 'issueDate' ? new Date(req.body[f]) : req.body[f];
      changes.push(f);
    }
  }

  // Optional file replacement
  if (req.file) {
    deleteLocalFile(document.fileUrl);
    document.fileUrl    = `/uploads/documents/${req.file.filename}`;
    document.fileType   = MIME_TO_FILETYPE[req.file.mimetype] || 'PDF';
    document.fileSizeKb = Math.round(req.file.size / 1024);
    changes.push('file');
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { document } });
  }

  await document.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'documents',
    targetId:    document._id.toString(),
    targetLabel: document.title,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'Document updated.', data: { document } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/documents/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) throw new AppError('Document not found.', 404);

  deleteLocalFile(document.fileUrl);
  await Document.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'documents',
    targetId:    req.params.id,
    targetLabel: document.title,
    detail:      `Deleted document: "${document.title}"`,
  });

  return sendSuccess(res, { message: `Document "${document.title}" deleted.` });
});

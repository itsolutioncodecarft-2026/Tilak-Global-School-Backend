/**
 * Gallery Controller
 *
 * Public:
 *   GET /api/gallery                  - published images (?category=&page=&limit=)
 *
 * Admin:
 *   GET    /api/admin/gallery          - all images with filters
 *   POST   /api/admin/gallery          - upload image + create record
 *   GET    /api/admin/gallery/:id      - single image detail
 *   PUT    /api/admin/gallery/:id      - update caption/category/order/status
 *   DELETE /api/admin/gallery/:id      - delete record + file from disk
 */
import path from 'path';
import fs   from 'fs';
import GalleryImage        from '../models/GalleryImage.model.js';
import { asyncHandler }    from '../utils/asyncHandler.js';
import { AppError }        from '../utils/AppError.js';
import { logActivity }     from '../utils/activityLogger.js';
import { sendSuccess, paginationMeta } from '../utils/response.js';
import { UPLOAD_DIR }      from '../config/env.js';

// ── Helper: delete local file safely ─────────────────────────────────────────
function deleteLocalFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) return;
  try {
    // relativeUrl = /uploads/gallery/abc.jpg
    // UPLOAD_DIR  = /abs/path/to/uploads
    const filename  = relativeUrl.replace('/uploads/', '');
    const absPath   = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch {
    // Non-blocking — log to console only
    console.warn('[Gallery] Could not delete file:', relativeUrl);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/gallery
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicGallery = asyncHandler(async (req, res) => {
  const q      = req.validatedQuery || req.query;
  const page   = Number(q.page)  || 1;
  const limit  = Math.min(50, Number(q.limit) || 20);
  const skip   = (page - 1) * limit;

  const filter = { status: 'published' };
  if (q.category && q.category !== 'all') filter.category = q.category;

  const [images, total] = await Promise.all([
    GalleryImage.find(filter)
      .select('imageUrl thumbnailUrl caption category albumName order createdAt')
      .sort({ category: 1, order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GalleryImage.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Gallery retrieved.',
    data:    { images },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/gallery
// ─────────────────────────────────────────────────────────────────────────────
export const listGallery = asyncHandler(async (req, res) => {
  const q     = req.validatedQuery || req.query;
  const page  = Number(q.page)  || 1;
  const limit = Math.min(100, Number(q.limit) || 20);
  const skip  = (page - 1) * limit;

  const filter = {};
  if (q.category && q.category !== 'all') filter.category = q.category;
  if (q.status   && q.status   !== 'all') filter.status   = q.status;

  const [images, total] = await Promise.all([
    GalleryImage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GalleryImage.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Gallery list retrieved.',
    data:    { images },
    meta:    paginationMeta(page, limit, total),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/gallery  (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadGallery = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Image file is required.' });
  }

  const imageUrl = `/uploads/gallery/${req.file.filename}`;
  const { caption, category, albumName, order, status } = req.body;

  const image = await GalleryImage.create({
    imageUrl,
    caption:    caption    ?? '',
    category,
    albumName:  albumName  ?? '',
    order:      Number(order) || 0,
    status:     status     ?? 'published',
    uploadedBy: req.admin.id,
  });

  await logActivity({
    admin:       req.admin,
    action:      'upload',
    module:      'gallery',
    targetId:    image._id.toString(),
    targetLabel: `${category} - ${caption || image.imageUrl}`,
    detail:      `Gallery image uploaded: ${req.file.filename}`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Image uploaded successfully.',
    data:       { image },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const getGalleryItem = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id).lean();
  if (!image) throw new AppError('Gallery image not found.', 404);

  return sendSuccess(res, { message: 'Gallery image retrieved.', data: { image } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const updateGallery = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image) throw new AppError('Gallery image not found.', 404);

  const fields = ['caption', 'category', 'albumName', 'order', 'status'];
  const changes = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      image[f] = req.body[f];
      changes.push(f);
    }
  }

  if (changes.length === 0) {
    return sendSuccess(res, { message: 'No changes.', data: { image } });
  }

  await image.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'gallery',
    targetId:    image._id.toString(),
    targetLabel: image.caption || image.imageUrl,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, { message: 'Gallery image updated.', data: { image } });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/gallery/:id
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGallery = asyncHandler(async (req, res) => {
  const image = await GalleryImage.findById(req.params.id);
  if (!image) throw new AppError('Gallery image not found.', 404);

  // Delete file from disk
  deleteLocalFile(image.imageUrl);
  if (image.thumbnailUrl) deleteLocalFile(image.thumbnailUrl);

  await GalleryImage.findByIdAndDelete(req.params.id);

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'gallery',
    targetId:    req.params.id,
    targetLabel: image.caption || image.imageUrl,
    detail:      `Gallery image deleted: ${image.imageUrl}`,
  });

  return sendSuccess(res, { message: 'Gallery image deleted.' });
});

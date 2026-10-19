/**
 * CMS Content Controller
 *
 * Public:
 *   GET /api/content/:page          — published blocks for a page
 *
 * Admin:
 *   GET    /api/admin/content                    — all blocks (all pages)
 *   GET    /api/admin/content/page/:page         — all blocks for one page
 *   GET    /api/admin/content/key/:key           — single block by key
 *   POST   /api/admin/content                    — create new block
 *   PUT    /api/admin/content/key/:key           — save draft or direct publish
 *   PATCH  /api/admin/content/key/:key/publish   — promote draft → live
 *   PATCH  /api/admin/content/key/:key/unpublish — take live → draft
 *   DELETE /api/admin/content/key/:key           — delete block
 *
 * Draft / publish workflow:
 *   PUT with { draftValue }   → saves draft, sets hasDraft=true, status stays published
 *   PUT with { value }        → updates live value directly (no draft)
 *   PATCH /publish            → copies draftValue → value, clears draft, sets publishedAt
 *   PATCH /unpublish          → sets status=draft (hides from public)
 */
import Content           from '../models/Content.model.js';
import { asyncHandler }  from '../utils/asyncHandler.js';
import { AppError }      from '../utils/AppError.js';
import { logActivity }   from '../utils/activityLogger.js';
import { sendSuccess, sendError } from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/content/:page
// Returns only published blocks — draftValue is never sent to public
// ─────────────────────────────────────────────────────────────────────────────
export const getPublishedPage = asyncHandler(async (req, res) => {
  const { page } = req.params;

  const blocks = await Content.find({ page, status: 'published' })
    .select('key page section label type value')  // never expose draftValue publicly
    .sort({ section: 1, key: 1 })
    .lean();

  // Return as a key-value map for easy frontend consumption
  // e.g. { 'home.hero.title': { label, type, value }, ... }
  const contentMap = {};
  for (const block of blocks) {
    contentMap[block.key] = {
      label:   block.label,
      type:    block.type,
      value:   block.value,
      section: block.section,
    };
  }

  return sendSuccess(res, {
    message: `Content for page '${page}' retrieved.`,
    data:    { page, content: contentMap },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/content
// ─────────────────────────────────────────────────────────────────────────────
export const listAllContent = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.page)    filter.page    = req.query.page;
  if (req.query.status)  filter.status  = req.query.status;
  if (req.query.hasDraft === 'true') filter.hasDraft = true;

  const blocks = await Content.find(filter)
    .sort({ page: 1, section: 1, key: 1 })
    .lean();

  return sendSuccess(res, {
    message: 'All content blocks retrieved.',
    data:    { total: blocks.length, blocks },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/content/page/:page
// ─────────────────────────────────────────────────────────────────────────────
export const getPageContent = asyncHandler(async (req, res) => {
  const { page } = req.params;

  const blocks = await Content.find({ page })
    .sort({ section: 1, key: 1 })
    .lean();

  return sendSuccess(res, {
    message: `Content blocks for page '${page}' retrieved.`,
    data:    { page, total: blocks.length, blocks },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/content/key/*
// ─────────────────────────────────────────────────────────────────────────────
export const getContentByKey = asyncHandler(async (req, res) => {
  // Wildcard route — key captured in req.contentKey
  const key = req.contentKey;
  const block = await Content.findOne({ key }).lean();
  if (!block) throw new AppError(`Content block '${key}' not found.`, 404);

  return sendSuccess(res, {
    message: 'Content block retrieved.',
    data:    { block },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/content
// ─────────────────────────────────────────────────────────────────────────────
export const createContent = asyncHandler(async (req, res) => {
  const { key, page, section, label, type, value } = req.body;

  const existing = await Content.findOne({ key });
  if (existing) {
    return sendError(res, {
      statusCode: 409,
      message:    `Content block with key '${key}' already exists.`,
    });
  }

  const block = await Content.create({
    key, page, section, label, type,
    value:      value ?? null,
    draftValue: null,
    hasDraft:   false,
    status:     'published',
    updatedBy:  req.admin.id,
    publishedAt: new Date(),
  });

  await logActivity({
    admin:       req.admin,
    action:      'create',
    module:      'content',
    targetId:    block.key,
    targetLabel: block.label,
    detail:      `Created content block: ${block.key}`,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message:    'Content block created.',
    data:       { block },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/content/key/*
// ─────────────────────────────────────────────────────────────────────────────
export const updateContent = asyncHandler(async (req, res) => {
  const key   = req.contentKey;
  const block = await Content.findOne({ key });
  if (!block) throw new AppError(`Content block '${key}' not found.`, 404);

  const { value, draftValue, label } = req.body;
  const changes = [];

  // Update live value directly (no draft workflow)
  if (value !== undefined) {
    block.value      = value;
    block.publishedAt = new Date();
    if (block.status !== 'published') block.status = 'published';
    changes.push('value (live)');
  }

  // Save as pending draft
  if (draftValue !== undefined) {
    block.draftValue = draftValue;
    block.hasDraft   = true;
    changes.push('draftValue');
  }

  // Update display label
  if (label !== undefined) {
    block.label = label;
    changes.push('label');
  }

  if (changes.length === 0) {
    return sendError(res, { statusCode: 400, message: 'No valid fields to update.' });
  }

  block.updatedBy = req.admin.id;
  await block.save();

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'content',
    targetId:    block.key,
    targetLabel: block.label,
    detail:      `Updated: ${changes.join(', ')}`,
  });

  return sendSuccess(res, {
    message: 'Content block updated.',
    data:    { block },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/content/key/*/publish
// ─────────────────────────────────────────────────────────────────────────────
export const publishContent = asyncHandler(async (req, res) => {
  const key   = req.contentKey;
  const block = await Content.findOne({ key });
  if (!block) throw new AppError(`Content block '${key}' not found.`, 404);

  if (!block.hasDraft && block.status === 'published') {
    return sendError(res, {
      statusCode: 400,
      message:    'No pending draft to publish. Block is already live.',
    });
  }

  // Promote draft to live if there is one
  if (block.hasDraft && block.draftValue !== null) {
    block.value     = block.draftValue;
    block.draftValue = null;
    block.hasDraft   = false;
  }

  block.status      = 'published';
  block.publishedAt = new Date();
  block.updatedBy   = req.admin.id;
  await block.save();

  await logActivity({
    admin:       req.admin,
    action:      'publish',
    module:      'content',
    targetId:    block.key,
    targetLabel: block.label,
    detail:      `Published content block: ${block.key}`,
  });

  return sendSuccess(res, {
    message: `Content block '${block.key}' published successfully.`,
    data:    { block },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PATCH /api/admin/content/key/*/unpublish
// ─────────────────────────────────────────────────────────────────────────────
export const unpublishContent = asyncHandler(async (req, res) => {
  const key   = req.contentKey;
  const block = await Content.findOne({ key });
  if (!block) throw new AppError(`Content block '${key}' not found.`, 404);

  if (block.status === 'draft') {
    return sendError(res, { statusCode: 400, message: 'Content block is already unpublished.' });
  }

  block.status    = 'draft';
  block.updatedBy = req.admin.id;
  await block.save();

  await logActivity({
    admin:       req.admin,
    action:      'unpublish',
    module:      'content',
    targetId:    block.key,
    targetLabel: block.label,
    detail:      `Unpublished content block: ${block.key}`,
  });

  return sendSuccess(res, {
    message: `Content block '${block.key}' unpublished.`,
    data:    { block },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  DELETE /api/admin/content/key/*
// ─────────────────────────────────────────────────────────────────────────────
export const deleteContent = asyncHandler(async (req, res) => {
  const key   = req.contentKey;
  const block = await Content.findOne({ key });
  if (!block) throw new AppError(`Content block '${key}' not found.`, 404);

  await Content.deleteOne({ key });

  await logActivity({
    admin:       req.admin,
    action:      'delete',
    module:      'content',
    targetId:    block.key,
    targetLabel: block.label,
    detail:      `Deleted content block: ${block.key}`,
  });

  return sendSuccess(res, {
    message: `Content block '${block.key}' deleted.`,
  });
});

/**
 * CMS content routes
 *
 * Content keys use dot-notation (e.g. home.hero.title).
 * Express 5 / path-to-regexp v8 does NOT match dots in :param by default.
 *
 * Design decision: pass key as query param ?key=<dotted.key>
 * This avoids all path-to-regexp limitations cleanly.
 *
 * Public:
 *   GET /api/content/:page                - published blocks for a page
 *
 * Admin /api/admin/content:
 *   GET    /                              - list all blocks
 *   GET    /page/:page                   - blocks for one page
 *   POST   /                             - create new block
 *   GET    /block?key=home.hero.title    - single block by key
 *   PUT    /block?key=home.hero.title    - update block (live or draft)
 *   PATCH  /block/publish?key=...        - promote draft to live
 *   PATCH  /block/unpublish?key=...      - take live back to draft
 *   DELETE /block?key=home.hero.title    - delete block
 */
import { Router } from 'express';
import {
  getPublishedPage, listAllContent, getPageContent,
  getContentByKey, createContent, updateContent,
  publishContent, unpublishContent, deleteContent,
} from '../controllers/content.controller.js';
import { authenticate }      from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/role.middleware.js';
import { validate }          from '../middleware/validate.middleware.js';
import { createContentSchema, updateContentSchema } from '../validators/content.validators.js';

// Middleware: read key from query string, inject req.contentKey
function extractKey(req, res, next) {
  const key = req.query.key;
  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ success: false, message: 'Query param ?key=<content-key> is required.' });
  }
  req.contentKey = key.trim().toLowerCase();
  next();
}

// Public router
export const publicContentRouter = Router();
publicContentRouter.get('/:page', getPublishedPage);

// Admin router
export const adminContentRouter = Router();
adminContentRouter.use(authenticate);

// List / create
adminContentRouter.get('/',
  requirePermission('content', 'view'),
  listAllContent
);

adminContentRouter.get('/page/:page',
  requirePermission('content', 'view'),
  getPageContent
);

adminContentRouter.post('/',
  requirePermission('content', 'edit'),
  validate(createContentSchema),
  createContent
);

// Block-level operations (key via query param)
adminContentRouter.get('/block',
  requirePermission('content', 'view'),
  extractKey,
  getContentByKey
);

adminContentRouter.put('/block',
  requirePermission('content', 'edit'),
  extractKey,
  validate(updateContentSchema),
  updateContent
);

adminContentRouter.patch('/block/publish',
  requirePermission('content', 'publish'),
  extractKey,
  publishContent
);

adminContentRouter.patch('/block/unpublish',
  requirePermission('content', 'publish'),
  extractKey,
  unpublishContent
);

adminContentRouter.delete('/block',
  requirePermission('content', 'edit'),
  extractKey,
  deleteContent
);

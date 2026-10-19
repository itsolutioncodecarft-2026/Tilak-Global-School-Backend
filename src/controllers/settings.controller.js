/**
 * Site Settings Controller
 *
 * Public:
 *   GET /api/settings               — safe public fields only
 *
 * Admin (super_admin only):
 *   GET  /api/admin/settings        — full settings document
 *   PUT  /api/admin/settings        — update any field(s)
 *   POST /api/admin/settings/logo           — upload logo image
 *   POST /api/admin/settings/favicon        — upload favicon image
 *   POST /api/admin/settings/director-photo — upload director portrait
 *
 * Public fields returned to visitors (no auth):
 *   schoolName, schoolSubtitle, topBarTagline, footerDescription,
 *   phone, admissionsPhone, email, admissionsEmail, address, pinCode,
 *   officeTimings, whatsappNumber, whatsappMessage, mapEmbedUrl,
 *   admissionSession, admissionBannerText, admissionsOpen,
 *   directorName, directorDesignation, directorMessage, directorPhotoUrl,
 *   logoUrl, socialLinks, brandColors, cbseAffiliationNo, cbseSchoolCode
 *
 * Fields NOT exposed publicly: updatedBy, updatedAt, privacyPolicyText (admin only)
 */
import path from 'path';
import fs   from 'fs';
import SiteSettings from '../models/SiteSettings.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logActivity }  from '../utils/activityLogger.js';
import { sendSuccess }  from '../utils/response.js';
import { UPLOAD_DIR }   from '../config/env.js';

// Fields safe to expose on the public endpoint
const PUBLIC_FIELDS = [
  'schoolName', 'schoolSubtitle', 'topBarTagline', 'footerDescription',
  'phone', 'admissionsPhone', 'email', 'admissionsEmail',
  'address', 'pinCode', 'officeTimings',
  'whatsappNumber', 'whatsappMessage', 'mapEmbedUrl',
  'admissionSession', 'admissionBannerText', 'admissionsOpen',
  'directorName', 'directorDesignation', 'directorMessage', 'directorPhotoUrl',
  'logoUrl', 'faviconUrl', 'socialLinks', 'brandColors',
  'cbseAffiliationNo', 'cbseSchoolCode',
];

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC  GET /api/settings
// ─────────────────────────────────────────────────────────────────────────────
export const getPublicSettings = asyncHandler(async (req, res) => {
  const doc = await SiteSettings.getSingleton();

  // Return only safe public fields
  const settings = {};
  for (const field of PUBLIC_FIELDS) {
    settings[field] = doc[field];
  }

  return sendSuccess(res, {
    message: 'Settings retrieved.',
    data:    { settings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  GET /api/admin/settings
// ─────────────────────────────────────────────────────────────────────────────
export const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();

  return sendSuccess(res, {
    message: 'Settings retrieved.',
    data:    { settings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  PUT /api/admin/settings
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = asyncHandler(async (req, res) => {
  // Strip any attempt to set file URL fields via this endpoint
  // (those go through dedicated upload endpoints)
  const { logoUrl, faviconUrl, directorPhotoUrl, ...safeUpdates } = req.body;

  const settings = await SiteSettings.updateSingleton(safeUpdates, req.admin.id);

  await logActivity({
    admin:       req.admin,
    action:      'update',
    module:      'settings',
    targetLabel: 'Site Settings',
    detail:      `Updated fields: ${Object.keys(safeUpdates).join(', ')}`,
  });

  return sendSuccess(res, {
    message:  'Settings updated successfully.',
    data:     { settings },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper — handle media upload, delete old file, update settings field
// ─────────────────────────────────────────────────────────────────────────────
async function handleMediaUpload(req, res, fieldName, logDetail) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  // Build the public URL path (relative to server root)
  const relativePath = `/uploads/media/${req.file.filename}`;

  // Delete old file if it exists and is stored locally
  const current = await SiteSettings.getSingleton();
  const oldUrl  = current[fieldName];
  if (oldUrl && oldUrl.startsWith('/uploads/')) {
    const oldAbsPath = path.join(UPLOAD_DIR, '..', oldUrl);
    if (fs.existsSync(oldAbsPath)) {
      fs.unlinkSync(oldAbsPath);
    }
  }

  const settings = await SiteSettings.updateSingleton(
    { [fieldName]: relativePath },
    req.admin.id
  );

  await logActivity({
    admin:       req.admin,
    action:      'upload',
    module:      'settings',
    targetLabel: 'Site Settings',
    detail:      logDetail,
  });

  return sendSuccess(res, {
    message: `${logDetail} successfully.`,
    data:    { url: relativePath, settings },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/logo
// ─────────────────────────────────────────────────────────────────────────────
export const uploadLogo = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'logoUrl', 'Logo uploaded');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/favicon
// ─────────────────────────────────────────────────────────────────────────────
export const uploadFavicon = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'faviconUrl', 'Favicon uploaded');
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN  POST /api/admin/settings/director-photo
// ─────────────────────────────────────────────────────────────────────────────
export const uploadDirectorPhoto = asyncHandler(async (req, res) => {
  return handleMediaUpload(req, res, 'directorPhotoUrl', 'Director photo uploaded');
});

/**
 * Activity logger — fire-and-forget writes to ActivityLog collection.
 *
 * A failure here must NEVER cause the main request to fail.
 *
 * admin object accepted in two shapes:
 *   1. JWT payload:  { id, email, name?, role, permissions }  ← from req.admin
 *   2. User doc:     { _id, email, name, role }               ← from DB lookup
 */
import ActivityLog from '../models/ActivityLog.model.js';

/**
 * @param {object} opts
 * @param {object} opts.admin        — req.admin (JWT payload) or AdminUser doc
 * @param {string} opts.action       — ACTIVITY_ACTIONS value
 * @param {string} opts.module       — ACTIVITY_MODULES value
 * @param {string} [opts.targetId]
 * @param {string} [opts.targetLabel]
 * @param {string} [opts.detail]
 */
export async function logActivity({ admin, action, module, targetId, targetLabel, detail }) {
  try {
    // Support both JWT payload ({ id }) and Mongoose doc ({ _id })
    const adminId   = admin.id || admin._id?.toString();
    const adminName = admin.name || admin.email || 'Unknown';

    await ActivityLog.create({
      adminUser:   adminId,
      adminName,
      action,
      module,
      targetId:    targetId    ?? null,
      targetLabel: targetLabel ?? '',
      detail:      detail      ?? '',
    });
  } catch (err) {
    // Log to console only — never throw, never block the request
    console.warn('[ActivityLog] Failed to write log:', err.message);
  }
}

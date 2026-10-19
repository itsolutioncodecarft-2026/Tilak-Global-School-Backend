/**
 * Activity logger — writes a record to the ActivityLog collection.
 *
 * Designed to be fire-and-forget (non-blocking).
 * A failure here must NEVER cause the main request to fail.
 *
 * Usage:
 *   import { logActivity } from '../utils/activityLogger.js';
 *
 *   await logActivity({
 *     admin:       req.admin,           // { id, email (adminName comes from here) }
 *     action:      'login',
 *     module:      'auth',
 *     targetId:    user._id.toString(),
 *     targetLabel: user.email,
 *     detail:      'Admin logged in successfully',
 *   });
 */
import ActivityLog from '../models/ActivityLog.model.js';

/**
 * @param {object} opts
 * @param {{ id: string, email: string, name?: string }} opts.admin  - from req.admin or user doc
 * @param {string} opts.action      - ACTIVITY_ACTIONS enum value
 * @param {string} opts.module      - ACTIVITY_MODULES enum value
 * @param {string} [opts.targetId]
 * @param {string} [opts.targetLabel]
 * @param {string} [opts.detail]
 */
export async function logActivity({ admin, action, module, targetId, targetLabel, detail }) {
  try {
    await ActivityLog.create({
      adminUser:   admin.id,
      adminName:   admin.name || admin.email,
      action,
      module,
      targetId:    targetId    ?? null,
      targetLabel: targetLabel ?? '',
      detail:      detail      ?? '',
    });
  } catch (err) {
    // Log to console only — never throw, never block the request
    console.warn('[ActivityLog] Failed to write activity log:', err.message);
  }
}

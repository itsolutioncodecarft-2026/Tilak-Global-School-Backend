/**
 * Dashboard Controller
 *
 * GET /api/admin/dashboard/stats          — summary counts
 * GET /api/admin/dashboard/stats/trend    — enquiries per day (last N days)
 * GET /api/admin/dashboard/stats/by-class — enquiry count grouped by class
 * GET /api/admin/dashboard/activity       — recent activity log
 *
 * All figures are computed from real DB records — never hardcoded.
 * All queries use aggregation pipelines or parallel countDocuments for efficiency.
 */
import AdmissionApplication from '../models/AdmissionApplication.model.js';
import ActivityLog          from '../models/ActivityLog.model.js';
import { CLASS_LIST }       from '../models/AdmissionApplication.model.js';
import { asyncHandler }     from '../utils/asyncHandler.js';
import { sendSuccess }      from '../utils/response.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats
//
// Response shape:
// {
//   total:          number,   — all time applications
//   pending:        number,
//   approved:       number,
//   rejected:       number,
//   info_requested: number,
//   today:          number,   — submitted today
//   thisMonth:      number,   — submitted this calendar month
//   enquiries:      number,   — source === 'enquiry'
//   applications:   number,   — source === 'application'
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
  const now         = new Date();
  const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all counts in parallel — single round-trip per count
  const [
    total,
    pending,
    approved,
    rejected,
    infoRequested,
    today,
    thisMonth,
    enquiries,
    applications,
  ] = await Promise.all([
    AdmissionApplication.countDocuments({}),
    AdmissionApplication.countDocuments({ status: 'pending' }),
    AdmissionApplication.countDocuments({ status: 'approved' }),
    AdmissionApplication.countDocuments({ status: 'rejected' }),
    AdmissionApplication.countDocuments({ status: 'info_requested' }),
    AdmissionApplication.countDocuments({ createdAt: { $gte: todayStart } }),
    AdmissionApplication.countDocuments({ createdAt: { $gte: monthStart } }),
    AdmissionApplication.countDocuments({ source: 'enquiry' }),
    AdmissionApplication.countDocuments({ source: 'application' }),
  ]);

  return sendSuccess(res, {
    message: 'Dashboard stats retrieved.',
    data: {
      total,
      byStatus: { pending, approved, rejected, info_requested: infoRequested },
      today,
      thisMonth,
      bySource: { enquiries, applications },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats/trend?days=30
//
// Returns daily submission counts for the last N days (default 30, max 90).
// Used to draw the enquiry trend chart on the dashboard.
//
// Response shape:
// {
//   days: 30,
//   trend: [
//     { date: "2026-10-01", count: 3 },
//     { date: "2026-10-02", count: 0 },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getTrend = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days) || 30));

  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);

  // Aggregate submissions grouped by UTC calendar day
  const raw = await AdmissionApplication.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$createdAt' },
          month: { $month: '$createdAt' },
          day:   { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Build a complete date series — fill missing days with count: 0
  const countMap = {};
  for (const entry of raw) {
    const { year, month, day } = entry._id;
    // Zero-pad month and day for consistent YYYY-MM-DD key
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    countMap[key] = entry.count;
  }

  const trend = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    trend.push({ date: key, count: countMap[key] ?? 0 });
  }

  return sendSuccess(res, {
    message: 'Trend data retrieved.',
    data: { days, trend },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/stats/by-class
//
// Returns enquiry counts per class, using the full CLASS_LIST as keys
// so the frontend always receives a complete ordered list (zeros included).
//
// Response shape:
// {
//   byClass: [
//     { class: "Nursery", count: 4 },
//     { class: "LKG",     count: 2 },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getByClass = asyncHandler(async (req, res) => {
  const raw = await AdmissionApplication.aggregate([
    {
      $group: {
        _id:   '$classApplying',
        count: { $sum: 1 },
      },
    },
  ]);

  // Map results for O(1) lookup
  const countMap = {};
  for (const entry of raw) {
    countMap[entry._id] = entry.count;
  }

  // Return full class list in canonical order — zeros for classes with no applications
  const byClass = CLASS_LIST.map((cls) => ({
    class: cls,
    count: countMap[cls] ?? 0,
  }));

  return sendSuccess(res, {
    message: 'By-class stats retrieved.',
    data: { byClass },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/activity?limit=20
//
// Returns the most recent N activity log entries (default 20, max 50).
// Only super_admin sees all modules; other roles see their permitted modules.
//
// Response shape:
// {
//   activity: [
//     {
//       _id, adminName, action, module,
//       targetId, targetLabel, detail, createdAt
//     },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
export const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  // Non-super_admin users only see activity for their permitted modules
  // Auth entries are always visible (login/logout for own account context)
  const filter = {};
  if (req.admin.role !== 'super_admin') {
    const perms = req.admin.permissions ?? {};
    // Build list of modules the user has view access to
    const allowedModules = Object.entries(perms)
      .filter(([, actions]) => actions?.view === true)
      .map(([mod]) => mod);
    // Always include 'auth' module (login/logout entries are non-sensitive)
    if (!allowedModules.includes('auth')) allowedModules.push('auth');
    if (allowedModules.length > 0) {
      filter.module = { $in: allowedModules };
    }
  }

  const activity = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();

  return sendSuccess(res, {
    message: 'Activity log retrieved.',
    data: { activity },
  });
});

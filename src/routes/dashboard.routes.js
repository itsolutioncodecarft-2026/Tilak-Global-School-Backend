/**
 * Dashboard routes — /api/admin/dashboard
 * All routes: authenticate + dashboard.view permission
 *
 * GET /api/admin/dashboard/stats          — summary counts
 * GET /api/admin/dashboard/stats/trend    — enquiry count by day (last 30 days)
 * GET /api/admin/dashboard/stats/by-class — enquiry count grouped by classApplying
 * GET /api/admin/dashboard/activity       — recent activity log (last 20 entries)
 */
import { Router } from 'express';
import { getStats, getTrend, getByClass, getActivity } from '../controllers/dashboard.controller.js';
import { authenticate }      from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate, requirePermission('dashboard', 'view'));

router.get('/stats',           getStats);
router.get('/stats/trend',     getTrend);
router.get('/stats/by-class',  getByClass);
router.get('/activity',        getActivity);

export default router;

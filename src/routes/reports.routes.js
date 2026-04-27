/**
 * Report routes — aggregated financial summaries, export to CSV/PDF.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const reportsController = require('../controllers/reports.controller');

const router = Router();

router.use(auth);

// GET /api/reports/monthly    — monthly summary (year + month filter)
router.get('/monthly', reportsController.monthly);

// GET /api/reports/yearly     — yearly summary
router.get('/yearly', reportsController.yearly);

// GET /api/reports/categories — breakdown by category
router.get('/categories', reportsController.categories);

// GET /api/reports/export/csv — export data as CSV
router.get('/export/csv', reportsController.exportCsv);

module.exports = router;

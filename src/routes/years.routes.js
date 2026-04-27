/**
 * Year and settings routes — manage year configs and per-month overrides.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const yearsController = require('../controllers/years.controller');

const router = Router();

router.use(auth);

// ── Years ──────────────────────────────────────────────
// GET    /api/years             — list all years for user
router.get('/', yearsController.list);

// POST   /api/years             — create new year config
router.post('/', yearsController.create);

// PUT    /api/years/:id         — update year defaults
router.put('/:id', yearsController.update);

// DELETE /api/years/:id         — delete a year
router.delete('/:id', yearsController.remove);

// PUT    /api/years/:id/activate — set as active year
router.put('/:id/activate', yearsController.activate);

// ── Per-month overrides ────────────────────────────────
// GET    /api/years/:id/overrides         — list overrides for a year
router.get('/:id/overrides', yearsController.listOverrides);

// POST   /api/years/:id/overrides         — create/update override
router.post('/:id/overrides', yearsController.upsertOverride);

// DELETE /api/years/:id/overrides/:month  — delete override for a month
router.delete('/:id/overrides/:month', yearsController.removeOverride);

module.exports = router;

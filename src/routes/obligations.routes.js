/**
 * Obligation routes — unified CRUD for tithes, offering, first fruit,
 * savings, fixed bills, loans, and other obligations.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const obligationsController = require('../controllers/obligations.controller');

const router = Router();

router.use(auth);

// ── Obligations ────────────────────────────────────────
// GET    /api/obligations             — list (filter by kind, year)
router.get('/', obligationsController.list);

// GET    /api/obligations/:id         — single obligation
router.get('/:id', obligationsController.getById);

// POST   /api/obligations             — create
router.post('/', obligationsController.create);

// PUT    /api/obligations/:id         — update
router.put('/:id', obligationsController.update);

// DELETE /api/obligations/:id         — delete
router.delete('/:id', obligationsController.remove);

// ── Obligation Entries (monthly payments/contributions) ─
// GET    /api/obligations/:id/entries — list entries for an obligation
router.get('/:id/entries', obligationsController.listEntries);

// POST   /api/obligations/:id/entries — add entry
router.post('/:id/entries', obligationsController.createEntry);

// PUT    /api/obligations/:id/entries/:entryId — update entry
router.put('/:id/entries/:entryId', obligationsController.updateEntry);

// DELETE /api/obligations/:id/entries/:entryId — delete entry
router.delete('/:id/entries/:entryId', obligationsController.removeEntry);

module.exports = router;

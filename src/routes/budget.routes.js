/**
 * Budget routes — planned vs actual budget comparison.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const budgetController = require('../controllers/budget.controller');

const router = Router();

router.use(auth);

// GET  /api/budget            — list budget entries for a year
router.get('/', budgetController.list);

// GET  /api/budget/:id        — single budget entry
router.get('/:id', budgetController.getById);

// POST /api/budget            — create/update budget entry for a month
router.post('/', budgetController.upsert);

module.exports = router;

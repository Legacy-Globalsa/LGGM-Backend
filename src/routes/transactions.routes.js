/**
 * Transaction routes — CRUD for daily income/expense entries.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const transactionsController = require('../controllers/transactions.controller');

const router = Router();

// All transaction routes require authentication
router.use(auth);

// GET    /api/transactions          — list (with year/month filters)
router.get('/', transactionsController.list);

// GET    /api/transactions/:id      — single transaction
router.get('/:id', transactionsController.getById);

// POST   /api/transactions          — create
router.post('/', transactionsController.create);

// PUT    /api/transactions/:id      — update
router.put('/:id', transactionsController.update);

// DELETE /api/transactions/:id      — delete
router.delete('/:id', transactionsController.remove);

module.exports = router;

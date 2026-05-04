/**
 * Category routes — manage income/expense categories.
 * All routes require authentication.
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const categoriesController = require('../controllers/categories.controller');

const router = Router();

router.use(auth);

// POST   /api/categories/seed-defaults — create defaults if none exist
router.post('/seed-defaults', categoriesController.seedDefaults);

// GET    /api/categories        — list user's categories
router.get('/', categoriesController.list);

// POST   /api/categories        — create category
router.post('/', categoriesController.create);

// PUT    /api/categories/:id    — update category
router.put('/:id', categoriesController.update);

// DELETE /api/categories/:id    — delete category
router.delete('/:id', categoriesController.remove);

module.exports = router;

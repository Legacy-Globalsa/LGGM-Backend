/**
 * Categories controller — CRUD for income/expense categories.
 *
 * Placeholder stubs — will be wired to Supabase queries in Phase 5.
 */

const stub = (action) => async (req, res, next) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: `Categories ${action} will be implemented in Phase 5 (Replace Mocks with Real APIs)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list: stub('list'),
  create: stub('create'),
  update: stub('update'),
  remove: stub('delete'),
};

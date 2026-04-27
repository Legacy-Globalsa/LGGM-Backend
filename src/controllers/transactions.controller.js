/**
 * Transactions controller — CRUD for daily income/expense entries.
 *
 * Placeholder stubs — will be wired to Supabase queries in Phase 5.
 */

const stub = (action) => async (req, res, next) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: `Transactions ${action} will be implemented in Phase 5 (Replace Mocks with Real APIs)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list: stub('list'),
  getById: stub('getById'),
  create: stub('create'),
  update: stub('update'),
  remove: stub('delete'),
};

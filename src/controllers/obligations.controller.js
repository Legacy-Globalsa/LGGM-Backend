/**
 * Obligations controller — CRUD for tithes, offering, first fruit,
 * savings, fixed bills, loans, other + their monthly entries.
 *
 * Placeholder stubs — will be wired to Supabase queries in Phase 5.
 */

const stub = (action) => async (req, res, next) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: `Obligations ${action} will be implemented in Phase 5 (Replace Mocks with Real APIs)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Obligations
  list: stub('list'),
  getById: stub('getById'),
  create: stub('create'),
  update: stub('update'),
  remove: stub('delete'),

  // Obligation Entries
  listEntries: stub('listEntries'),
  createEntry: stub('createEntry'),
  updateEntry: stub('updateEntry'),
  removeEntry: stub('deleteEntry'),
};

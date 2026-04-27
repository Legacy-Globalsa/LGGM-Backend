/**
 * Years controller — manage year configs and per-month overrides.
 *
 * Placeholder stubs — will be wired to Supabase queries in Phase 5.
 */

const stub = (action) => async (req, res, next) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: `Years ${action} will be implemented in Phase 5 (Replace Mocks with Real APIs)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Years
  list: stub('list'),
  create: stub('create'),
  update: stub('update'),
  remove: stub('delete'),
  activate: stub('activate'),

  // Overrides
  listOverrides: stub('listOverrides'),
  upsertOverride: stub('upsertOverride'),
  removeOverride: stub('removeOverride'),
};

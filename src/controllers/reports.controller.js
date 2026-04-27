/**
 * Reports controller — aggregated financial summaries and exports.
 *
 * Placeholder stubs — will be wired to Supabase queries in Phase 5.
 */

const stub = (action) => async (req, res, next) => {
  try {
    res.status(501).json({
      error: 'Not Implemented',
      message: `Reports ${action} will be implemented in Phase 5 (Replace Mocks with Real APIs)`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  monthly: stub('monthly'),
  yearly: stub('yearly'),
  categories: stub('categories'),
  exportCsv: stub('exportCsv'),
};

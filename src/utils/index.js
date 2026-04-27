/**
 * Utility helpers shared across the backend.
 */

/**
 * Wraps an async route handler so thrown errors are forwarded to
 * Express's error handler via `next(err)`.
 *
 * Usage:
 *   router.get('/items', asyncHandler(async (req, res) => { ... }));
 *
 * @param {Function} fn — async (req, res, next) => void
 * @returns {Function}
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Parses a string to a positive integer. Returns `defaultVal` if
 * the input is falsy or not a valid positive integer.
 *
 * @param {string|undefined} value
 * @param {number} defaultVal
 * @returns {number}
 */
function parsePositiveInt(value, defaultVal) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultVal;
}

/**
 * Returns the current month number (1–12).
 * @returns {number}
 */
function currentMonth() {
  return new Date().getMonth() + 1;
}

/**
 * Returns the current year (e.g. 2026).
 * @returns {number}
 */
function currentYear() {
  return new Date().getFullYear();
}

module.exports = {
  asyncHandler,
  parsePositiveInt,
  currentMonth,
  currentYear,
};

/**
 * Re-export all middleware for convenient single import.
 *
 * Usage: const { auth, errorHandler, validate, globalLimiter } = require('./middleware');
 */
const { auth, optionalAuth } = require('./auth');
const { AppError, notFound, errorHandler } = require('./errorHandler');
const { validate } = require('./validate');
const { globalLimiter, authLimiter } = require('./rateLimiter');

module.exports = {
  auth,
  optionalAuth,
  AppError,
  notFound,
  errorHandler,
  validate,
  globalLimiter,
  authLimiter,
};

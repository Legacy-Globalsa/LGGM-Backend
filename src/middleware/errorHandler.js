/**
 * Centralized error-handling middleware.
 *
 * Catches all errors thrown / passed via `next(err)` and returns a
 * consistent JSON response. In production, stack traces are hidden.
 */
const env = require('../config/env');

/**
 * Custom application error with an HTTP status code.
 */
class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   * @param {string} [code] – optional machine-readable error code
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler — attach as the last non-error middleware.
 */
function notFound(req, res, _next) {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} does not exist`,
  });
}

/**
 * Global error handler — attach as the very last middleware.
 * Express identifies error handlers by the 4-parameter signature.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Default to 500 if no status code was set
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log the full error in development, just the message in production
  if (env.isDev) {
    console.error('─── ERROR ───────────────────────────────────');
    console.error(`Status: ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error(err.stack);
    console.error('─────────────────────────────────────────────');
  } else {
    console.error(`[${statusCode}] ${message}`);
  }

  const response = {
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Error',
    message: env.isProd && statusCode >= 500
      ? 'An unexpected error occurred'
      : message,
    ...(err.code && { code: err.code }),
  };

  // Include stack trace only in development
  if (env.isDev && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { AppError, notFound, errorHandler };

/**
 * Rate-limiting middleware.
 *
 * Two limiters are exported:
 *   • `globalLimiter`  – applied to every route (default: 100 req / 15 min)
 *   • `authLimiter`    – stricter limit for auth-related routes (20 req / 15 min)
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/** Default limiter — applied globally. */
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,   // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,     // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the request limit. Please try again later.',
  },
});

/** Stricter limiter for authentication endpoints (login, signup, password reset). */
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 20,  // Much stricter than the global limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again later.',
  },
});

module.exports = { globalLimiter, authLimiter };

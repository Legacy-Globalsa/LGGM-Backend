/**
 * Authentication routes — signup, login, logout, password reset.
 *
 * These endpoints proxy to Supabase Auth so the frontend never
 * needs to know the service role key and we can add server-side
 * validation / rate limiting.
 */
const { Router } = require('express');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/auth.controller');

const router = Router();

// Apply stricter rate limiting to all auth routes
router.use(authLimiter);

// POST /api/auth/signup
router.post('/signup', authController.signup);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// GET /api/auth/me  (requires valid token)
const { auth } = require('../middleware/auth');
router.get('/me', auth, authController.me);

module.exports = router;

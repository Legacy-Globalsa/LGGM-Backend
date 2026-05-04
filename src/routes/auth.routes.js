/**
 * Authentication routes — signup, login, logout, password reset.
 *
 * These endpoints proxy to Supabase Auth so the frontend never
 * needs to know the service role key and we can add server-side
 * validation / rate limiting.
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authLimiter, validate, auth } = require('../middleware');
const authController = require('../controllers/auth.controller');

const router = Router();

// Apply stricter rate limiting only to credential mutation routes (not /me)
router.post('/signup', authLimiter, validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
]), authController.signup);

router.post('/login', authLimiter, validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
]), authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, validate([
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
]), authController.forgotPassword);

// GET /api/auth/me  (requires valid token)
router.get('/me', auth, authController.me);

module.exports = router;

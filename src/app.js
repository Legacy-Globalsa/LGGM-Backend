/**
 * Express application setup.
 *
 * This module creates and configures the Express app with all
 * middleware and routes. It does NOT call `app.listen()` — that
 * responsibility belongs to `index.js` so the app can be imported
 * for testing without starting a server.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { env } = require('./config');
const { mountRoutes } = require('./routes');
const { globalLimiter, notFound, errorHandler } = require('./middleware');

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to frontend origin ────────────────────────
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────
app.use(globalLimiter);

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Cookies ───────────────────────────────────────────────────
app.use(cookieParser());

// ── Response compression ──────────────────────────────────────
app.use(compression());

// ── Request logging ───────────────────────────────────────────
// 'dev' format for development (colored, concise), 'combined' for production
app.use(morgan(env.isDev ? 'dev' : 'combined'));

// ── Health check (no auth required) ───────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ────────────────────────────────────────────────
mountRoutes(app);

// ── 404 handler (must come after routes) ──────────────────────
app.use(notFound);

// ── Global error handler (must be last) ───────────────────────
app.use(errorHandler);

module.exports = app;

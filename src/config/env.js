/**
 * Environment configuration — loads and validates .env variables.
 * Import this module first in any file that needs env values.
 */
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root (Backend/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  // Server
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // CORS
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Supabase
  // Accept both SUPABASE_URL and VITE_SUPABASE_URL (frontend convention) for convenience
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  // The publishable key (anon key) — used when creating per-request user-scoped clients
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
};

// ── Validate required variables ───────────────────────────────────
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_JWT_SECRET'];
const missing = required.filter((key) => !env[key] || env[key].startsWith('your-'));

if (missing.length > 0 && env.isProd) {
  console.error(`❌  Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (missing.length > 0 && env.isDev) {
  console.warn(
    `⚠️  Missing or placeholder environment variables: ${missing.join(', ')}. ` +
    `Some features (Supabase auth, service-role queries) will not work until you configure them.`
  );
}

module.exports = env;

/**
 * Authentication middleware — verifies the Supabase JWT from the
 * Authorization header and attaches the authenticated user to `req.user`.
 *
 * Also creates a per-request Supabase client scoped to the user's token
 * (`req.supabase`) so downstream handlers can make RLS-respecting queries.
 */
const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

/**
 * Extracts the Bearer token from the Authorization header.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

/**
 * Express middleware that requires a valid Supabase JWT.
 *
 * On success:
 *   - `req.user`     – the authenticated user object (from Supabase)
 *   - `req.userId`   – shorthand for `req.user.id`
 *   - `req.supabase` – a Supabase client scoped to this user's token (respects RLS)
 *
 * On failure: responds with 401.
 */
async function auth(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      });
    }

    // Validate that Supabase env vars are configured
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Auth middleware: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication service is not configured',
      });
    }

    // Create a per-request client authenticated with the user's token.
    // Uses the anon key (not service role) so RLS policies are enforced.
    const anonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(env.SUPABASE_URL, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify the token by fetching the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired token',
      });
    }

    // Attach to request
    req.user = user;
    req.userId = user.id;
    req.supabase = supabase;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional auth — same as `auth` but does NOT reject the request
 * when no token is present. If a valid token is provided the user
 * is attached; otherwise `req.user` remains undefined.
 */
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  // Delegate to the main auth handler
  return auth(req, res, next);
}

module.exports = { auth, optionalAuth };

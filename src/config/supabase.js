/**
 * Supabase server-side client — uses the **service role key**.
 *
 * ⚠️  This client bypasses RLS. Use it only when the backend needs
 *     to perform admin-level operations (e.g. creating a profile row
 *     on signup, running aggregate queries for reports).
 *
 * For user-scoped operations the auth middleware attaches a
 * per-request client (`req.supabase`) that respects RLS.
 */
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabaseAdmin = null;

/**
 * Returns the singleton Supabase admin client.
 * Lazy-initialised so the module can be imported even when env vars
 * are still placeholders (dev mode).
 */
function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Cannot create Supabase admin client — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
    );
  }

  supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdmin;
}

module.exports = { getSupabaseAdmin };

/**
 * Re-export all config modules for convenient single import.
 *
 * Usage: const { env, getSupabaseAdmin } = require('./config');
 */
const env = require('./env');
const { getSupabaseAdmin } = require('./supabase');

module.exports = { env, getSupabaseAdmin };

/**
 * Server entry point.
 *
 * Loads environment variables, creates the Express app, and starts
 * listening. Keep this file minimal — all app configuration lives
 * in `app.js`.
 */

// Load env first (before any other module reads process.env)
const { env } = require('./config');
const app = require('./app');

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────┐');
  console.log('│           LGGM Backend API Server            │');
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Status:      ✅ Running                     │`);
  console.log(`│  Port:        ${String(PORT).padEnd(30)}│`);
  console.log(`│  Environment: ${env.NODE_ENV.padEnd(30)}│`);
  console.log(`│  Frontend:    ${env.FRONTEND_URL.padEnd(30)}│`);
  console.log('├─────────────────────────────────────────────┤');
  console.log(`│  Health:      http://localhost:${PORT}/api/health │`);
  console.log('└─────────────────────────────────────────────┘');
  console.log('');
});

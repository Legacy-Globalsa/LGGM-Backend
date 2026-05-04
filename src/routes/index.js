/**
 * Route barrel — mounts all route modules under their prefixes.
 *
 * Usage in app.js:
 *   const { mountRoutes } = require('./routes');
 *   mountRoutes(app);
 */
const authRoutes = require('./auth.routes');
const transactionsRoutes = require('./transactions.routes');
const budgetRoutes = require('./budget.routes');
const obligationsRoutes = require('./obligations.routes');
const reportsRoutes = require('./reports.routes');
const yearsRoutes = require('./years.routes');
const categoriesRoutes = require('./categories.routes');
const moneyAccountsRoutes = require('./money_accounts.routes');

/**
 * Mounts all API routes under `/api`.
 * @param {import('express').Express} app
 */
function mountRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/budget', budgetRoutes);
  app.use('/api/obligations', obligationsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/years', yearsRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/money-accounts', moneyAccountsRoutes);
}

module.exports = { mountRoutes };

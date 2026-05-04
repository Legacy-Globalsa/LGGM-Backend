/**
 * Reports controller — aggregated financial summaries and exports.
 */
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/reports/monthly?year_id=&month=
 */
async function monthly(req, res, next) {
  try {
    const { year_id, month } = req.query;
    if (!year_id || !month) throw new AppError('year_id and month are required', 422, 'VALIDATION_ERROR');

    const monthInt = parseInt(month, 10);

    const [{ data: txns }, { data: entries }] = await Promise.all([
      req.supabase
        .from('transactions')
        .select('*, categories(name), money_accounts(name)')
        .eq('year_id', year_id).eq('user_id', req.userId).eq('month', monthInt)
        .order('transaction_date'),
      req.supabase
        .from('obligation_entries')
        .select('*, obligations(kind, description)')
        .eq('year_id', year_id).eq('user_id', req.userId).eq('month', monthInt),
    ]);

    const income = (txns || []).filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expenses = (txns || []).filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const totalGiven = (entries || [])
      .filter((e) => ['tithes', 'offering', 'first_fruit'].includes(e.obligations?.kind))
      .reduce((s, e) => s + Number(e.actual_amount), 0);
    const totalSaved = (entries || [])
      .filter((e) => e.obligations?.kind === 'savings' && e.transferred_to_bank)
      .reduce((s, e) => s + Number(e.actual_amount), 0);

    res.json({
      year_id, month: monthInt, income, expenses, surplus: income - expenses,
      total_given: totalGiven, total_saved: totalSaved,
      transactions: (txns || []).map((t) => ({
        ...t,
        category_name: t.categories?.name ?? null,
        money_account_name: t.money_accounts?.name ?? null,
        categories: undefined, money_accounts: undefined,
      })),
      obligation_entries: (entries || []).map((e) => ({
        ...e,
        obligation_kind: e.obligations?.kind ?? null,
        obligation_description: e.obligations?.description ?? null,
        obligations: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/yearly?year_id=
 */
async function yearly(req, res, next) {
  try {
    const { year_id } = req.query;
    if (!year_id) throw new AppError('year_id is required', 422, 'VALIDATION_ERROR');

    const [{ data: txns }, { data: entries }] = await Promise.all([
      req.supabase
        .from('transactions').select('month, type, amount')
        .eq('year_id', year_id).eq('user_id', req.userId),
      req.supabase
        .from('obligation_entries')
        .select('month, actual_amount, transferred_to_bank, obligations(kind)')
        .eq('year_id', year_id).eq('user_id', req.userId),
    ]);

    // Aggregate by month
    const monthMap = new Map();
    for (let m = 1; m <= 12; m++) {
      monthMap.set(m, { month: m, income: 0, expenses: 0, given: 0, saved: 0 });
    }
    for (const t of (txns || [])) {
      const row = monthMap.get(t.month);
      if (t.type === 'income') row.income += Number(t.amount);
      else row.expenses += Number(t.amount);
    }
    for (const e of (entries || [])) {
      const row = monthMap.get(e.month);
      const kind = e.obligations?.kind;
      if (['tithes', 'offering', 'first_fruit'].includes(kind)) row.given += Number(e.actual_amount);
      if (kind === 'savings' && e.transferred_to_bank) row.saved += Number(e.actual_amount);
    }

    const months = Array.from(monthMap.values());
    const totals = months.reduce((acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      given: acc.given + m.given,
      saved: acc.saved + m.saved,
    }), { income: 0, expenses: 0, given: 0, saved: 0 });

    res.json({ year_id, months, totals, surplus: totals.income - totals.expenses });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/categories?year_id=&month=
 */
async function categories(req, res, next) {
  try {
    const { year_id, month } = req.query;
    if (!year_id) throw new AppError('year_id is required', 422, 'VALIDATION_ERROR');

    let query = req.supabase
      .from('transactions')
      .select('type, amount, categories(id, name)')
      .eq('year_id', year_id).eq('user_id', req.userId);
    if (month) query = query.eq('month', parseInt(month, 10));

    const { data: txns, error } = await query;
    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    const catMap = new Map();
    for (const t of (txns || [])) {
      const catId = t.categories?.id ?? 'uncategorized';
      const catName = t.categories?.name ?? 'Uncategorized';
      if (!catMap.has(catId)) catMap.set(catId, { id: catId, name: catName, income: 0, expenses: 0 });
      const row = catMap.get(catId);
      if (t.type === 'income') row.income += Number(t.amount);
      else row.expenses += Number(t.amount);
    }

    res.json(Array.from(catMap.values()).sort((a, b) => b.expenses - a.expenses));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/export/csv?year_id=&month=
 */
async function exportCsv(req, res, next) {
  try {
    const { year_id, month } = req.query;
    if (!year_id) throw new AppError('year_id is required', 422, 'VALIDATION_ERROR');

    let query = req.supabase
      .from('transactions')
      .select('transaction_date, description, type, amount, status, notes, categories(name), money_accounts(name)')
      .eq('year_id', year_id).eq('user_id', req.userId)
      .order('transaction_date');
    if (month) query = query.eq('month', parseInt(month, 10));

    const { data: txns, error } = await query;
    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    const header = 'Date,Description,Type,Category,Account,Amount,Status,Notes';
    const rows = (txns || []).map((t) => {
      const cols = [
        t.transaction_date,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.type,
        `"${(t.categories?.name || '').replace(/"/g, '""')}"`,
        `"${(t.money_accounts?.name || '').replace(/"/g, '""')}"`,
        Number(t.amount).toFixed(2),
        t.status,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
      return cols.join(',');
    });

    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${year_id}${month ? `-m${month}` : ''}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { monthly, yearly, categories, exportCsv };

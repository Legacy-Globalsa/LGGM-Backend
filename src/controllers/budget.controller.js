/**
 * Budget controller — planned vs actual per month, computed from
 * transactions + obligation_entries, stored in monthly_budget.
 */
const { AppError } = require('../middleware/errorHandler');

/**
 * Resolve the effective percentage for a field, falling back from
 * override → year default.
 */
function resolvePct(yearRow, override, field) {
  return override?.[field] ?? yearRow[field] ?? 0;
}

/**
 * Compute and upsert monthly_budget rows for a given year.
 * Returns the final array of MonthlyBudget objects.
 */
async function computeAndUpsertBudgets(supabase, userId, yearId) {
  // 1. Fetch the year defaults
  const { data: yearRow, error: yearErr } = await supabase
    .from('years').select('*').eq('id', yearId).eq('user_id', userId).single();
  if (yearErr || !yearRow) throw new AppError('Year not found', 404, 'NOT_FOUND');

  // 2. Fetch per-month overrides
  const { data: overrides } = await supabase
    .from('year_month_overrides')
    .select('*').eq('year_id', yearId).eq('user_id', userId);
  const overrideMap = new Map((overrides || []).map((o) => [o.month, o]));

  // 3. Aggregate transactions by month
  const { data: txns } = await supabase
    .from('transactions').select('month, type, amount')
    .eq('year_id', yearId).eq('user_id', userId);
  const txnByMonth = new Map();
  for (const t of (txns || [])) {
    if (!txnByMonth.has(t.month)) txnByMonth.set(t.month, { income: 0, expenses: 0 });
    const agg = txnByMonth.get(t.month);
    if (t.type === 'income') agg.income += Number(t.amount);
    else agg.expenses += Number(t.amount);
  }

  // 4. Aggregate obligation_entries by month and kind
  const { data: entries } = await supabase
    .from('obligation_entries')
    .select('month, actual_amount, transferred_to_bank, obligations(kind)')
    .eq('year_id', yearId).eq('user_id', userId);
  const oblByMonth = new Map(); // month -> { tithes, offering, first_fruit, savings, loans, fixed_bills, other }
  for (const e of (entries || [])) {
    const kind = e.obligations?.kind;
    if (!kind) continue;
    if (!oblByMonth.has(e.month)) oblByMonth.set(e.month, {
      tithes: 0, offering: 0, first_fruit: 0, savings: 0, loans: 0, fixed_bills: 0, other: 0,
    });
    const m = oblByMonth.get(e.month);
    const amount = Number(e.actual_amount);
    if (kind === 'tithes') m.tithes += amount;
    else if (kind === 'offering') m.offering += amount;
    else if (kind === 'first_fruit') m.first_fruit += amount;
    else if (kind === 'savings') {
      // Savings only counts when transferred
      if (e.transferred_to_bank) m.savings += amount;
    }
    else if (kind === 'loan') m.loans += amount;
    else if (kind === 'fixed_bill') m.fixed_bills += amount;
    else m.other += amount;
  }

  // 5. Build rows for all 12 months
  const rows = [];
  for (let month = 1; month <= 12; month++) {
    const override = overrideMap.get(month);
    const txn = txnByMonth.get(month) || { income: 0, expenses: 0 };
    const obl = oblByMonth.get(month) || {
      tithes: 0, offering: 0, first_fruit: 0, savings: 0, loans: 0, fixed_bills: 0, other: 0,
    };

    const income = txn.income;
    const tithes_planned   = income * resolvePct(yearRow, override, 'tithes_pct') / 100;
    const offering_planned = income * resolvePct(yearRow, override, 'offering_pct') / 100;
    const savings_planned  = income * resolvePct(yearRow, override, 'savings_pct') / 100;
    const first_fruit_planned = income * resolvePct(yearRow, override, 'first_fruit_pct') / 100;
    const other_planned    = income * resolvePct(yearRow, override, 'other_expenses_pct') / 100;

    const totalActual = obl.tithes + obl.offering + obl.first_fruit + obl.savings
      + obl.loans + obl.fixed_bills + obl.other + txn.expenses;
    const totalPlanned = tithes_planned + offering_planned + savings_planned + first_fruit_planned + other_planned;
    const status = totalActual > totalPlanned ? 'over_budget'
      : totalActual === totalPlanned ? 'at_budget' : 'under_budget';

    rows.push({
      user_id: userId,
      year_id: yearId,
      month,
      income_amount: income,
      tithes_planned,
      offering_planned,
      savings_planned,
      first_fruit_planned,
      other_planned,
      tithes_actual: obl.tithes,
      offering_actual: obl.offering,
      savings_actual: obl.savings,
      first_fruit_actual: obl.first_fruit,
      loans_actual: obl.loans,
      fixed_bills_actual: obl.fixed_bills,
      other_actual: txn.expenses,
      status,
    });
  }

  // 6. Upsert all 12 rows
  const { data: upserted, error: upsertErr } = await supabase
    .from('monthly_budget')
    .upsert(rows, { onConflict: 'year_id,month' })
    .select();
  if (upsertErr) throw new AppError(upsertErr.message, 400, 'DB_ERROR');
  return (upserted || rows).sort((a, b) => a.month - b.month);
}

/**
 * GET /api/budget?year_id=
 */
async function list(req, res, next) {
  try {
    const { year_id } = req.query;
    if (!year_id) throw new AppError('year_id query param is required', 422, 'VALIDATION_ERROR');

    const result = await computeAndUpsertBudgets(req.supabase, req.userId, year_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/budget/:id
 */
async function getById(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('monthly_budget')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw new AppError('Budget row not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/budget  — force recalculate and upsert for a year
 */
async function upsert(req, res, next) {
  try {
    const { year_id } = req.body;
    if (!year_id) throw new AppError('year_id is required', 422, 'VALIDATION_ERROR');

    const result = await computeAndUpsertBudgets(req.supabase, req.userId, year_id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, upsert };

/**
 * Transactions controller — CRUD for daily income/expense entries.
 *
 * Balance rule:
 *   income  transaction → account balance INCREASES (+amount)
 *   expense transaction → account balance DECREASES (−amount)
 * Reversals are applied on delete; old/new deltas on update.
 */
const { AppError } = require('../middleware/errorHandler');

/**
 * Adjusts a money account's balance by `delta`.
 * Silently skips if accountId is null/undefined.
 */
async function adjustAccountBalance(supabase, accountId, delta, userId) {
  if (!accountId || delta === 0) return;
  const { data: acct, error } = await supabase
    .from('money_accounts')
    .select('balance')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();
  if (error || !acct) return;
  await supabase
    .from('money_accounts')
    .update({ balance: parseFloat(acct.balance) + delta })
    .eq('id', accountId)
    .eq('user_id', userId);
}

/** Returns +amount for income, −amount for expense. */
function balanceDelta(type, amount) {
  return type === 'income' ? amount : -amount;
}

/**
 * GET /api/transactions?year_id=&month=
 */
async function list(req, res, next) {
  try {
    const { year_id, month } = req.query;
    let query = req.supabase
      .from('transactions')
      .select('*, categories(name), money_accounts(name)')
      .eq('user_id', req.userId)
      .order('transaction_date', { ascending: false });

    if (year_id) query = query.eq('year_id', year_id);
    if (month) query = query.eq('month', parseInt(month, 10));

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    // Flatten joined names
    const result = (data || []).map((t) => ({
      ...t,
      category_name: t.categories?.name ?? null,
      money_account_name: t.money_accounts?.name ?? null,
      categories: undefined,
      money_accounts: undefined,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/transactions/:id
 */
async function getById(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('transactions')
      .select('*, categories(name), money_accounts(name)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    res.json({
      ...data,
      category_name: data.categories?.name ?? null,
      money_account_name: data.money_accounts?.name ?? null,
      categories: undefined,
      money_accounts: undefined,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/transactions
 */
async function create(req, res, next) {
  try {
    const {
      year_id, month, transaction_date, description,
      type, category_id, amount, status, notes,
    } = req.body;

    const money_account_id = req.body.money_account_id || null;

    if (!year_id || !month || !transaction_date || !type || amount == null) {
      throw new AppError('year_id, month, transaction_date, type and amount are required', 422, 'VALIDATION_ERROR');
    }
    if (!money_account_id) {
      throw new AppError('money_account_id is required', 422, 'VALIDATION_ERROR');
    }

    const parsedAmount = parseFloat(amount);

    const { data, error } = await req.supabase
      .from('transactions')
      .insert({
        user_id: req.userId,
        year_id,
        month: parseInt(month, 10),
        transaction_date,
        description: description ?? '',
        type,
        category_id: category_id || null,
        money_account_id,
        amount: parsedAmount,
        status: status ?? 'completed',
        notes: notes ?? '',
      })
      .select('*, categories(name), money_accounts(name)')
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    // Update account balance
    await adjustAccountBalance(req.supabase, money_account_id, balanceDelta(type, parsedAmount), req.userId);

    res.status(201).json({
      ...data,
      category_name: data.categories?.name ?? null,
      money_account_name: data.money_accounts?.name ?? null,
      categories: undefined,
      money_accounts: undefined,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/transactions/:id
 */
async function update(req, res, next) {
  try {
    // Fetch the existing transaction so we can reverse its balance effect
    const { data: old, error: fetchErr } = await req.supabase
      .from('transactions')
      .select('type, amount, money_account_id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (fetchErr || !old) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    const allowed = [
      'transaction_date', 'description', 'type', 'category_id',
      'amount', 'status', 'notes', 'month', 'money_account_id',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.amount !== undefined) patch.amount = parseFloat(patch.amount);
    if (patch.month !== undefined) patch.month = parseInt(patch.month, 10);

    // Require account on update too
    if ('money_account_id' in patch && !patch.money_account_id) {
      throw new AppError('money_account_id is required', 422, 'VALIDATION_ERROR');
    }

    const { data, error } = await req.supabase
      .from('transactions')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select('*, categories(name), money_accounts(name)')
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    // Reverse old balance effect, then apply new
    const newType   = patch.type   ?? old.type;
    const newAmount = patch.amount ?? parseFloat(old.amount);
    const newAccId  = patch.money_account_id !== undefined ? patch.money_account_id : old.money_account_id;

    // Reverse old
    await adjustAccountBalance(req.supabase, old.money_account_id, -balanceDelta(old.type, parseFloat(old.amount)), req.userId);
    // Apply new
    await adjustAccountBalance(req.supabase, newAccId, balanceDelta(newType, newAmount), req.userId);

    res.json({
      ...data,
      category_name: data.categories?.name ?? null,
      money_account_name: data.money_accounts?.name ?? null,
      categories: undefined,
      money_accounts: undefined,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/transactions/:id
 */
async function remove(req, res, next) {
  try {
    // Fetch before delete so we can reverse the balance
    const { data: old, error: fetchErr } = await req.supabase
      .from('transactions')
      .select('type, amount, money_account_id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();
    if (fetchErr || !old) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

    const { error } = await req.supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    // Reverse the balance effect
    await adjustAccountBalance(req.supabase, old.money_account_id, -balanceDelta(old.type, parseFloat(old.amount)), req.userId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };

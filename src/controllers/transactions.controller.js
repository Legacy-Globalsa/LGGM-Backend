/**
 * Transactions controller — CRUD for daily income/expense entries.
 */
const { AppError } = require('../middleware/errorHandler');

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

    if (!year_id || !month || !transaction_date || !type || amount == null) {
      throw new AppError('year_id, month, transaction_date, type and amount are required', 422, 'VALIDATION_ERROR');
    }

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
        money_account_id: null,
        amount: parseFloat(amount),
        status: status ?? 'completed',
        notes: notes ?? '',
      })
      .select('*, categories(name), money_accounts(name)')
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

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
    const allowed = [
      'transaction_date', 'description', 'type', 'category_id',
      'amount', 'status', 'notes', 'month',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.amount !== undefined) patch.amount = parseFloat(patch.amount);
    if (patch.month !== undefined) patch.month = parseInt(patch.month, 10);

    const { data, error } = await req.supabase
      .from('transactions')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select('*, categories(name), money_accounts(name)')
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Transaction not found', 404, 'NOT_FOUND');

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
    const { error } = await req.supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };

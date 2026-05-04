/**
 * Money Accounts controller — CRUD for bank accounts, wallets, GCash, etc.
 */
const { AppError } = require('../middleware/errorHandler');

const VALID_TYPES = ['bank_account', 'cash_on_hand', 'stc_bank', 'gcash', 'e_wallet', 'other'];

/**
 * GET /api/money-accounts
 */
async function list(req, res, next) {
  try {
    const { include_inactive } = req.query;
    let query = req.supabase
      .from('money_accounts')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at');

    if (!include_inactive || include_inactive === 'false') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/money-accounts/:id
 */
async function getById(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('money_accounts')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw new AppError('Money account not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/money-accounts
 */
async function create(req, res, next) {
  try {
    const { name, type, account_identifier, balance, notes } = req.body;
    if (!name || !type) throw new AppError('name and type are required', 422, 'VALIDATION_ERROR');
    if (!VALID_TYPES.includes(type)) {
      throw new AppError(`type must be one of: ${VALID_TYPES.join(', ')}`, 422, 'VALIDATION_ERROR');
    }

    const { data, error } = await req.supabase
      .from('money_accounts')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        type,
        account_identifier: account_identifier ?? '',
        balance: balance != null ? parseFloat(balance) : 0,
        is_active: true,
        notes: notes ?? '',
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/money-accounts/:id
 */
async function update(req, res, next) {
  try {
    const allowed = ['name', 'type', 'account_identifier', 'balance', 'is_active', 'notes'];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (patch.name) patch.name = patch.name.trim();
    if (patch.balance != null) patch.balance = parseFloat(patch.balance);

    const { data, error } = await req.supabase
      .from('money_accounts')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Money account not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/money-accounts/:id — soft delete (is_active = false)
 */
async function remove(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('money_accounts')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Money account not found', 404, 'NOT_FOUND');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove };

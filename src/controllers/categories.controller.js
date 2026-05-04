/**
 * Categories controller — CRUD for income/expense categories.
 */
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary',          type: 'income' },
  { name: 'Business',        type: 'income' },
  { name: 'Freelance',       type: 'income' },
  { name: 'Investment',      type: 'income' },
  { name: 'Other Income',    type: 'income' },
  // Expense
  { name: 'Food & Dining',   type: 'expense' },
  { name: 'Transportation',  type: 'expense' },
  { name: 'Utilities',       type: 'expense' },
  { name: 'Healthcare',      type: 'expense' },
  { name: 'Entertainment',   type: 'expense' },
  { name: 'Shopping',        type: 'expense' },
  { name: 'Education',       type: 'expense' },
  { name: 'Other Expenses',  type: 'expense' },
];

async function seedDefaults(req, res, next) {
  try {
    // Check if user already has categories
    const { data: existing } = await req.supabase
      .from('categories')
      .select('id')
      .eq('user_id', req.userId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Already has categories — return current list
      const { data } = await req.supabase
        .from('categories').select('*').eq('user_id', req.userId).order('type').order('name');
      return res.json(data || []);
    }

    const rows = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: req.userId }));
    const { data, error } = await req.supabase
      .from('categories').insert(rows).select().order('type').order('name');

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(201).json(data || []);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('categories')
      .select('*')
      .eq('user_id', req.userId)
      .order('type')
      .order('name');

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { name, type } = req.body;
    if (!name || !type) throw new AppError('name and type are required', 422, 'VALIDATION_ERROR');
    if (!['income', 'expense'].includes(type)) throw new AppError('type must be income or expense', 422, 'VALIDATION_ERROR');

    const { data, error } = await req.supabase
      .from('categories')
      .insert({ user_id: req.userId, name: name.trim(), type })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const patch = {};
    if (req.body.name !== undefined) patch.name = req.body.name.trim();
    if (req.body.type !== undefined) patch.type = req.body.type;

    const { data, error } = await req.supabase
      .from('categories')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Category not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { error } = await req.supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, seedDefaults };

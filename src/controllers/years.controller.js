/**
 * Years controller — manage year configs and per-month overrides.
 */
const { AppError } = require('../middleware/errorHandler');

// ─── Years ──────────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('years')
      .select('*')
      .eq('user_id', req.userId)
      .order('year', { ascending: false });

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      year, tithes_pct, offering_pct, savings_pct,
      first_fruit_pct, other_expenses_pct,
    } = req.body;

    if (!year) throw new AppError('year is required', 422, 'VALIDATION_ERROR');

    const { data, error } = await req.supabase
      .from('years')
      .insert({
        user_id: req.userId,
        year: parseInt(year, 10),
        is_active: req.body.is_active === true ? true : false,
        tithes_pct: tithes_pct ?? 10,
        offering_pct: offering_pct ?? 5,
        savings_pct: savings_pct ?? 10,
        first_fruit_pct: first_fruit_pct ?? 0,
        other_expenses_pct: other_expenses_pct ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('A year record for that year already exists', 409, 'DUPLICATE');
      throw new AppError(error.message, 400, 'DB_ERROR');
    }
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const allowed = [
      'tithes_pct', 'offering_pct', 'savings_pct',
      'first_fruit_pct', 'other_expenses_pct',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = parseFloat(req.body[key]);
    }

    const { data, error } = await req.supabase
      .from('years')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Year not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { error } = await req.supabase
      .from('years')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/years/:id/activate
 * Sets this year as active; deactivates all others for this user.
 */
async function activate(req, res, next) {
  try {
    // Deactivate all years for this user first
    await req.supabase
      .from('years')
      .update({ is_active: false })
      .eq('user_id', req.userId);

    const { data, error } = await req.supabase
      .from('years')
      .update({ is_active: true })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Year not found', 404, 'NOT_FOUND');
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ─── Month Overrides ─────────────────────────────────────────────────

async function listOverrides(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('year_month_overrides')
      .select('*')
      .eq('year_id', req.params.id)
      .eq('user_id', req.userId)
      .order('month');

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/years/:id/overrides  — upsert by (year_id, month)
 */
async function upsertOverride(req, res, next) {
  try {
    const { month, tithes_pct, offering_pct, savings_pct, first_fruit_pct, other_expenses_pct, notes } = req.body;
    if (!month) throw new AppError('month is required', 422, 'VALIDATION_ERROR');

    const payload = {
      user_id: req.userId,
      year_id: req.params.id,
      month: parseInt(month, 10),
      tithes_pct: tithes_pct ?? null,
      offering_pct: offering_pct ?? null,
      savings_pct: savings_pct ?? null,
      first_fruit_pct: first_fruit_pct ?? null,
      other_expenses_pct: other_expenses_pct ?? null,
      notes: notes ?? '',
    };

    const { data, error } = await req.supabase
      .from('year_month_overrides')
      .upsert(payload, { onConflict: 'year_id,month' })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function removeOverride(req, res, next) {
  try {
    const { error } = await req.supabase
      .from('year_month_overrides')
      .delete()
      .eq('year_id', req.params.id)
      .eq('month', req.params.month)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list, create, update, remove, activate,
  listOverrides, upsertOverride, removeOverride,
};

/**
 * Obligations controller — CRUD for tithes, offering, first fruit,
 * savings, fixed bills, loans, other + their monthly entries.
 */
const { AppError } = require('../middleware/errorHandler');

const VALID_KINDS = ['tithes', 'offering', 'first_fruit', 'savings', 'fixed_bill', 'loan', 'other'];

async function getObligation(supabase, userId, obligationId) {
  const { data, error } = await supabase
    .from('obligations')
    .select('id, kind')
    .eq('id', obligationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) throw new AppError('Obligation not found', 404, 'NOT_FOUND');
  return data;
}

async function getEntryByMonth(supabase, userId, obligationId, month) {
  const { data, error } = await supabase
    .from('obligation_entries')
    .select('*')
    .eq('obligation_id', obligationId)
    .eq('user_id', userId)
    .eq('month', parseInt(month, 10))
    .maybeSingle();

  if (error) throw new AppError(error.message, 400, 'DB_ERROR');
  return data;
}

async function adjustAccountBalance(supabase, userId, accountId, delta) {
  if (!accountId || delta === 0) return;

  const { data: account, error: readError } = await supabase
    .from('money_accounts')
    .select('balance')
    .eq('id', accountId)
    .eq('user_id', userId)
    .single();

  if (readError || !account) throw new AppError('Money account not found', 404, 'NOT_FOUND');

  const { error: updateError } = await supabase
    .from('money_accounts')
    .update({ balance: Number(account.balance) + delta })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (updateError) throw new AppError(updateError.message, 400, 'DB_ERROR');
}

function savingsContribution(entry) {
  if (!entry?.transferred_to_bank || !entry.transferred_to_account) return null;
  return {
    accountId: entry.transferred_to_account,
    amount: Number(entry.actual_amount) || 0,
  };
}

async function applySavingsTransferBalance(supabase, userId, beforeEntry, afterEntry) {
  const before = savingsContribution(beforeEntry);
  const after = savingsContribution(afterEntry);

  if (before?.accountId && after?.accountId && before.accountId === after.accountId) {
    await adjustAccountBalance(supabase, userId, after.accountId, after.amount - before.amount);
    return;
  }

  if (before?.accountId) await adjustAccountBalance(supabase, userId, before.accountId, -before.amount);
  if (after?.accountId) await adjustAccountBalance(supabase, userId, after.accountId, after.amount);
}

function validateTransferFields(obligation, row) {
  const hasTransferData = row.transferred_to_bank || row.transferred_to_account;
  if (hasTransferData && obligation.kind !== 'savings') {
    throw new AppError('Only savings entries can be transferred to money accounts', 422, 'VALIDATION_ERROR');
  }

  if (obligation.kind === 'savings' && row.transferred_to_bank && !row.transferred_to_account) {
    throw new AppError('A transfer account is required when marking savings as transferred', 422, 'VALIDATION_ERROR');
  }
}

// ─── Obligations ─────────────────────────────────────────────────────

async function list(req, res, next) {
  try {
    const { year_id, kind } = req.query;
    let query = req.supabase
      .from('obligations')
      .select('*, obligation_entries(*)')
      .eq('user_id', req.userId)
      .order('created_at');

    if (year_id) query = query.eq('year_id', year_id);
    if (kind) query = query.eq('kind', kind);

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 400, 'DB_ERROR');

    // Rename obligation_entries -> entries to match frontend types
    const result = (data || []).map((o) => ({
      ...o,
      entries: o.obligation_entries ?? [],
      obligation_entries: undefined,
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('obligations')
      .select('*, obligation_entries(*)')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error) throw new AppError('Obligation not found', 404, 'NOT_FOUND');

    res.json({ ...data, entries: data.obligation_entries ?? [], obligation_entries: undefined });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const {
      year_id, kind, description, frequency, default_amount, remarks,
      interest_bearing, interest_pct, duration, loan_amount, interest_amount,
    } = req.body;

    if (!year_id || !kind) throw new AppError('year_id and kind are required', 422, 'VALIDATION_ERROR');
    if (!VALID_KINDS.includes(kind)) throw new AppError(`kind must be one of: ${VALID_KINDS.join(', ')}`, 422, 'VALIDATION_ERROR');

    const { data, error } = await req.supabase
      .from('obligations')
      .insert({
        user_id: req.userId,
        year_id,
        kind,
        description: description ?? '',
        frequency: frequency ?? 'Monthly',
        default_amount: default_amount != null ? parseFloat(default_amount) : null,
        remarks: remarks ?? '',
        interest_bearing: interest_bearing ?? null,
        interest_pct: interest_pct != null ? parseFloat(interest_pct) : null,
        duration: duration ?? null,
        loan_amount: loan_amount != null ? parseFloat(loan_amount) : null,
        interest_amount: interest_amount != null ? parseFloat(interest_amount) : null,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.status(201).json({ ...data, entries: [] });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const allowed = [
      'description', 'frequency', 'default_amount', 'remarks',
      'interest_bearing', 'interest_pct', 'duration', 'loan_amount', 'interest_amount',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    for (const numKey of ['default_amount', 'interest_pct', 'loan_amount', 'interest_amount']) {
      if (patch[numKey] != null) patch[numKey] = parseFloat(patch[numKey]);
    }

    const { data, error } = await req.supabase
      .from('obligations')
      .update(patch)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select('*, obligation_entries(*)')
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Obligation not found', 404, 'NOT_FOUND');
    res.json({ ...data, entries: data.obligation_entries ?? [], obligation_entries: undefined });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const obligation = await getObligation(req.supabase, req.userId, req.params.id);
    const { data: existingEntries, error: entriesError } = await req.supabase
      .from('obligation_entries')
      .select('*')
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId);

    if (entriesError) throw new AppError(entriesError.message, 400, 'DB_ERROR');

    const { error } = await req.supabase
      .from('obligations')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (obligation.kind === 'savings') {
      for (const entry of (existingEntries || [])) {
        await applySavingsTransferBalance(req.supabase, req.userId, entry, null);
      }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Obligation Entries ──────────────────────────────────────────────

async function listEntries(req, res, next) {
  try {
    const { data, error } = await req.supabase
      .from('obligation_entries')
      .select('*')
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId)
      .order('month');

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    res.json(data || []);
  } catch (err) {
    next(err);
  }
}

async function createEntry(req, res, next) {
  try {
    const { year_id, month, planned_amount, actual_amount, paid, notes,
      transferred_to_bank, transferred_at, transferred_to_account } = req.body;

    if (!year_id || !month) throw new AppError('year_id and month are required', 422, 'VALIDATION_ERROR');

    const obligation = await getObligation(req.supabase, req.userId, req.params.id);
    const existingEntry = await getEntryByMonth(req.supabase, req.userId, req.params.id, month);

    const row = {
      user_id: req.userId,
      obligation_id: req.params.id,
      year_id,
      month: parseInt(month, 10),
      planned_amount: planned_amount != null ? parseFloat(planned_amount) : Number(existingEntry?.planned_amount ?? 0),
      actual_amount: actual_amount != null ? parseFloat(actual_amount) : Number(existingEntry?.actual_amount ?? 0),
      paid: paid ?? existingEntry?.paid ?? false,
      notes: notes ?? existingEntry?.notes ?? '',
      transferred_to_bank: transferred_to_bank ?? existingEntry?.transferred_to_bank ?? false,
      transferred_at: transferred_at !== undefined ? transferred_at : existingEntry?.transferred_at ?? null,
      transferred_to_account: transferred_to_account !== undefined ? transferred_to_account : existingEntry?.transferred_to_account ?? null,
    };

    if (!row.transferred_to_bank) {
      row.transferred_at = null;
      row.transferred_to_account = null;
    }

    validateTransferFields(obligation, row);

    const { data, error } = await req.supabase
      .from('obligation_entries')
      .upsert(row, { onConflict: 'obligation_id,month' })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (obligation.kind === 'savings') {
      await applySavingsTransferBalance(req.supabase, req.userId, existingEntry, data);
    }
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

async function updateEntry(req, res, next) {
  try {
    const { data: existingEntry, error: existingError } = await req.supabase
      .from('obligation_entries')
      .select('*')
      .eq('id', req.params.entryId)
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (existingError || !existingEntry) throw new AppError('Entry not found', 404, 'NOT_FOUND');

    const obligation = await getObligation(req.supabase, req.userId, req.params.id);
    const allowed = [
      'planned_amount', 'actual_amount', 'paid', 'notes',
      'transferred_to_bank', 'transferred_at', 'transferred_to_account',
    ];
    const patch = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    for (const numKey of ['planned_amount', 'actual_amount']) {
      if (patch[numKey] != null) patch[numKey] = parseFloat(patch[numKey]);
    }

    const nextEntry = { ...existingEntry, ...patch };
    if (!nextEntry.transferred_to_bank) {
      patch.transferred_at = null;
      patch.transferred_to_account = null;
      nextEntry.transferred_at = null;
      nextEntry.transferred_to_account = null;
    }

    validateTransferFields(obligation, nextEntry);

    const { data, error } = await req.supabase
      .from('obligation_entries')
      .update(patch)
      .eq('id', req.params.entryId)
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (!data) throw new AppError('Entry not found', 404, 'NOT_FOUND');
    if (obligation.kind === 'savings') {
      await applySavingsTransferBalance(req.supabase, req.userId, existingEntry, data);
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function removeEntry(req, res, next) {
  try {
    const obligation = await getObligation(req.supabase, req.userId, req.params.id);
    const { data: existingEntry, error: existingError } = await req.supabase
      .from('obligation_entries')
      .select('*')
      .eq('id', req.params.entryId)
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (existingError || !existingEntry) throw new AppError('Entry not found', 404, 'NOT_FOUND');

    const { error } = await req.supabase
      .from('obligation_entries')
      .delete()
      .eq('id', req.params.entryId)
      .eq('obligation_id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw new AppError(error.message, 400, 'DB_ERROR');
    if (obligation.kind === 'savings') {
      await applySavingsTransferBalance(req.supabase, req.userId, existingEntry, null);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list, getById, create, update, remove,
  listEntries, createEntry, updateEntry, removeEntry,
};

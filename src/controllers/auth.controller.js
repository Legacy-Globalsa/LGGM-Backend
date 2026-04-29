/**
 * Auth controller — handles signup, login, logout, password reset.
 *
 * All auth flows go through the backend so we can:
 *   - Rate limit and validate server-side
 *   - Use the service role key for admin operations
 *   - Create profiles and seed categories on signup
 *   - Never expose the service role key to the frontend
 */
const { getSupabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/auth/signup
 * Body: { email, password, fullName }
 *
 * Creates the user via Supabase Auth admin, creates a profile row,
 * seeds default categories, then signs the user in and returns
 * session tokens so the frontend is immediately authenticated.
 */
async function signup(req, res, next) {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400, 'WEAK_PASSWORD');
    }

    const supabase = getSupabaseAdmin();

    // 1. Create the user in Supabase Auth
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development; toggle for production
      user_metadata: {
        full_name: fullName || email.split('@')[0],
      },
    });

    if (createError) {
      if (createError.message.includes('already') || createError.message.includes('exists')) {
        throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
      }
      throw new AppError(createError.message, 400, 'AUTH_ERROR');
    }

    const user = createData.user;

    // 2. Create a profile row for the new user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: fullName || email.split('@')[0],
        avatar_url: null,
      });

    if (profileError) {
      console.error('Failed to create profile:', profileError.message);
    }

    // 3. Seed default categories for the user
    const defaultCategories = [
      { user_id: user.id, name: 'Salary', type: 'income' },
      { user_id: user.id, name: 'Part Time Job', type: 'income' },
      { user_id: user.id, name: 'Freelance', type: 'income' },
      { user_id: user.id, name: 'Gift', type: 'income' },
      { user_id: user.id, name: 'Other Income', type: 'income' },
      { user_id: user.id, name: 'Electricity', type: 'expense' },
      { user_id: user.id, name: 'Water', type: 'expense' },
      { user_id: user.id, name: 'Internet', type: 'expense' },
      { user_id: user.id, name: 'Food', type: 'expense' },
      { user_id: user.id, name: 'Transportation', type: 'expense' },
      { user_id: user.id, name: 'Rent', type: 'expense' },
      { user_id: user.id, name: 'Family Support', type: 'expense' },
      { user_id: user.id, name: 'Medical', type: 'expense' },
      { user_id: user.id, name: 'Education', type: 'expense' },
      { user_id: user.id, name: 'Other Expense', type: 'expense' },
    ];

    const { error: catError } = await supabase
      .from('categories')
      .insert(defaultCategories);

    if (catError) {
      console.error('Failed to seed categories:', catError.message);
    }

    // 4. Sign the user in to get session tokens
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // User was created but sign-in failed — they can log in manually
      return res.status(201).json({
        message: 'Account created successfully. Please log in.',
        user: {
          id: user.id,
          email: user.email,
          full_name: fullName || email.split('@')[0],
        },
        session: null,
      });
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: fullName || email.split('@')[0],
      },
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_at: signInData.session.expires_at,
        expires_in: signInData.session.expires_in,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Signs the user in via Supabase Auth and returns session tokens.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_FIELDS');
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const { user, session } = data;

    // Fetch the user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || email.split('@')[0],
        avatar_url: profile?.avatar_url || null,
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const supabase = getSupabaseAdmin();
        await supabase.auth.admin.signOut(token);
      } catch {
        // Token might already be invalid — that's fine
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 400, 'MISSING_FIELDS');
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`,
    });

    if (error) {
      console.error('Password reset error:', error.message);
    }

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — return current authenticated user with profile
 * Requires: auth middleware
 */
async function me(req, res, next) {
  try {
    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', req.user.id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: profile?.full_name || req.user.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        created_at: req.user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, forgotPassword, me };

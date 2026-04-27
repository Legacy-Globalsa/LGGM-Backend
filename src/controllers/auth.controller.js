/**
 * Auth controller — handles signup, login, logout, password reset.
 *
 * These are placeholder stubs that will be wired to Supabase Auth
 * in Phase 4. For now they return mock responses so the route
 * structure can be tested.
 */

/**
 * POST /api/auth/signup
 */
async function signup(req, res, next) {
  try {
    // TODO: Phase 4 — wire to Supabase Auth
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Signup will be implemented in Phase 4 (Database & Auth Wiring)',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    // TODO: Phase 4 — wire to Supabase Auth
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Login will be implemented in Phase 4 (Database & Auth Wiring)',
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
    // TODO: Phase 4 — wire to Supabase Auth
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Logout will be implemented in Phase 4 (Database & Auth Wiring)',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    // TODO: Phase 4 — wire to Supabase Auth
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Password reset will be implemented in Phase 4 (Database & Auth Wiring)',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me — return current authenticated user
 */
async function me(req, res, next) {
  try {
    // The auth middleware has already verified the token and attached req.user
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        created_at: req.user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { signup, login, logout, forgotPassword, me };

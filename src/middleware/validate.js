/**
 * Validation middleware — wraps express-validator to keep
 * route files clean.
 *
 * Usage:
 *   const { body } = require('express-validator');
 *   const { validate } = require('../middleware/validate');
 *
 *   router.post(
 *     '/transactions',
 *     validate([
 *       body('amount').isNumeric().withMessage('Amount must be a number'),
 *       body('description').trim().notEmpty(),
 *     ]),
 *     transactionsController.create
 *   );
 */
const { validationResult } = require('express-validator');

/**
 * Returns an Express middleware that runs the given validation chains
 * and, if any fail, responds with 422 and the collected errors.
 *
 * @param {import('express-validator').ValidationChain[]} validations
 * @returns {import('express').RequestHandler}
 */
function validate(validations) {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    return res.status(422).json({
      error: 'Validation Error',
      message: 'One or more fields failed validation',
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  };
}

module.exports = { validate };

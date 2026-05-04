/**
 * Money Accounts routes
 */
const { Router } = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/money_accounts.controller');

const router = Router();

router.get('/',     auth, ctrl.list);
router.get('/:id',  auth, ctrl.getById);
router.post('/',    auth, ctrl.create);
router.put('/:id',  auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

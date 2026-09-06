const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./loginMethods.controller');
const { methodParamSchema, updateBodySchema } = require('./loginMethods.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js (prefix /api/superadmin/login-methods) — yêu cầu `settings.manage`.
router.use(authorize('settings.manage'));

router.get('/', controller.list);
router.patch('/:method', validate({ params: methodParamSchema, body: updateBodySchema }), controller.update);

module.exports = router;

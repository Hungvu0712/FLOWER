const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./roles.controller');
const { createRoleSchema, updateRoleSchema, idParamSchema } = require('./roles.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js (prefix /api/superadmin/roles) — yêu cầu permission `roles.manage`.
router.use(authorize('roles.manage'));

router.get('/', controller.list);
router.post('/', validate({ body: createRoleSchema }), controller.create);
router.patch('/:id', validate({ params: idParamSchema, body: updateRoleSchema }), controller.update);
router.delete('/:id', validate({ params: idParamSchema }), controller.remove);

module.exports = router;

const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./users.admin.controller');
const { idParamSchema, updateRoleSchema, listQuerySchema } = require('./users.admin.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js (prefix /api/superadmin) — mọi route yêu cầu permission
// `users.manage`, mặc định chỉ role super_admin có (xem DATABASE.md §2.4).
router.use(authorize('users.manage'));

router.get('/', validate({ query: listQuerySchema }), controller.list);
router.patch('/:id/block', validate({ params: idParamSchema }), controller.block);
router.patch('/:id/unblock', validate({ params: idParamSchema }), controller.unblock);
router.delete('/:id', validate({ params: idParamSchema }), controller.remove);
router.post('/:id/reset-password', validate({ params: idParamSchema }), controller.resetPassword);
router.patch('/:id/role', validate({ params: idParamSchema, body: updateRoleSchema }), controller.updateRole);

module.exports = router;

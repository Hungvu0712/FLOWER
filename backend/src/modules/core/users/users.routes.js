const express = require('express');
const validate = require('../../../middlewares/validate');
const controller = require('./users.controller');
const { updateProfileSchema, changePasswordSchema, sessionIdParamSchema } = require('./users.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js (prefix /api/account) — mọi route ở đây yêu cầu đã đăng nhập.
router.get('/me', controller.getMe);
router.patch('/profile', validate({ body: updateProfileSchema }), controller.updateProfile);
router.post('/change-password', validate({ body: changePasswordSchema }), controller.changePassword);
router.get('/sessions', controller.listSessions);
router.delete('/sessions/:id', validate({ params: sessionIdParamSchema }), controller.revokeSession);
router.delete('/sessions', controller.revokeOtherSessions);

module.exports = router;

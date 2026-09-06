const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./auditLog.controller');
const { listQuerySchema } = require('./auditLog.validation');

const router = express.Router();

// Gắn sẵn authenticate ở nơi mount router (xem app.js) — ở đây chỉ cần authorize thêm permission cụ thể.
router.get('/', authorize('audit.view'), validate({ query: listQuerySchema }), controller.list);

module.exports = router;

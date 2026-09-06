const express = require('express');
const validate = require('../../../middlewares/validate');
const authorize = require('../../../middlewares/authorize');
const controller = require('./files.controller');
const { presignSchema, createFileSchema, listQuerySchema, idParamSchema } = require('./files.validation');

const router = express.Router();

// Mount với `authenticate` ở app.js — upload (presign/create) mở cho mọi user đã đăng nhập
// (vd tự đổi avatar); xem/xoá trong màn quản lý tài nguyên yêu cầu quyền `files.manage`.
router.post('/presign', validate({ body: presignSchema }), controller.presign);
router.post('/', validate({ body: createFileSchema }), controller.create);
router.get('/', authorize('files.manage'), validate({ query: listQuerySchema }), controller.list);
router.delete('/:id', authorize('files.manage'), validate({ params: idParamSchema }), controller.remove);

module.exports = router;

const asyncHandler = require('../../../middlewares/asyncHandler');
const service = require('./users.admin.service');

const list = asyncHandler(async (req, res) => {
  const result = await service.listUsers(req.query);
  res.json({ success: true, data: result });
});

const block = asyncHandler(async (req, res) => {
  await service.setBlocked(req.user.id, req.params.id, true, req.ip);
  res.json({ success: true, message: 'Đã khoá tài khoản' });
});

const unblock = asyncHandler(async (req, res) => {
  await service.setBlocked(req.user.id, req.params.id, false, req.ip);
  res.json({ success: true, message: 'Đã mở khoá tài khoản' });
});

const remove = asyncHandler(async (req, res) => {
  await service.softDeleteUser(req.user.id, req.params.id, req.ip);
  res.json({ success: true, message: 'Đã xoá tài khoản' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.user.id, req.params.id, req.ip);
  res.json({ success: true, message: 'Đã gửi mật khẩu mới qua email' });
});

const updateRole = asyncHandler(async (req, res) => {
  await service.updateRole(req.user.id, req.params.id, req.body.roleCode, req.ip);
  res.json({ success: true, message: 'Đã cập nhật role' });
});

module.exports = { list, block, unblock, remove, resetPassword, updateRole };

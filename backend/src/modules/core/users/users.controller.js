const asyncHandler = require('../../../middlewares/asyncHandler');
const usersService = require('./users.service');

const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getMe(req.user.id);
  res.json({ success: true, data: user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  res.json({ success: true, data: user });
});

const changePassword = asyncHandler(async (req, res) => {
  await usersService.changePassword(req.user.id, req.body);
  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await usersService.listSessions(req.user.id, req.cookies?.refresh_token);
  res.json({ success: true, data: sessions });
});

const revokeSession = asyncHandler(async (req, res) => {
  await usersService.revokeSession(req.user.id, req.params.id);
  res.json({ success: true, message: 'Đã đăng xuất thiết bị' });
});

const revokeOtherSessions = asyncHandler(async (req, res) => {
  await usersService.revokeOtherSessions(req.user.id, req.cookies?.refresh_token);
  res.json({ success: true, message: 'Đã đăng xuất tất cả thiết bị khác' });
});

module.exports = { getMe, updateProfile, changePassword, listSessions, revokeSession, revokeOtherSessions };

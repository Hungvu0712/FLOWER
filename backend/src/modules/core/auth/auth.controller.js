const asyncHandler = require('../../../middlewares/asyncHandler');
const authService = require('./auth.service');
const auditLog = require('../audit-log/auditLog.service');
const { setAuthCookies, clearAuthCookies } = require('./cookie.util');
const { requestMeta } = require('./device.util');

function respondWithSession(res, session) {
  setAuthCookies(res, session);
  res.json({ success: true, data: { user: session.user } });
}

const getLoginMethods = asyncHandler(async (req, res) => {
  const methods = await authService.getLoginMethods();
  res.json({ success: true, data: methods });
});

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  const session = await authService.issueSession(user, requestMeta(req));
  await auditLog.record({ actorId: user.id, action: 'auth.register', entityType: 'user', entityId: user.id });
  respondWithSession(res, session);
});

const login = asyncHandler(async (req, res) => {
  const user = await authService.loginWithPassword(req.body);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

const requestMagicLink = asyncHandler(async (req, res) => {
  await authService.requestMagicLink(req.body);
  // Luôn trả về thành công dù email có tồn tại hay không, tránh lộ thông tin tài khoản.
  res.json({ success: true, message: 'Nếu email tồn tại, liên kết đăng nhập đã được gửi.' });
});

const verifyMagicLink = asyncHandler(async (req, res) => {
  const user = await authService.verifyMagicLink(req.body);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

const googleLogin = asyncHandler(async (req, res) => {
  const user = await authService.loginWithGoogle(req.body);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refreshSession(req.cookies?.refresh_token, requestMeta(req));
  respondWithSession(res, session);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refresh_token);
  clearAuthCookies(res);
  res.json({ success: true, message: 'Đã đăng xuất' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  res.json({ success: true, message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  res.json({ success: true, message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại.' });
});

module.exports = {
  getLoginMethods,
  register,
  login,
  requestMagicLink,
  verifyMagicLink,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};

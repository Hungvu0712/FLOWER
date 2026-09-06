const AppError = require('../lib/AppError');
const { verifyAccessToken } = require('../lib/jwt');

// Verify JWT (từ cookie httpOnly 'access_token', hoặc header Authorization: Bearer <token>
// cho client không phải trình duyệt) và gắn req.user = { id, roles, permissions }.
function authenticate(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.access_token || bearer;

  if (!token) {
    return next(new AppError('Chưa đăng nhập', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
    };
    next();
  } catch (err) {
    next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN'));
  }
}

module.exports = authenticate;

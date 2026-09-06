const AppError = require('../lib/AppError');

// authorize('orders.update_status') hoặc authorize('a.x', 'b.y') — yêu cầu đủ tất cả permission truyền vào.
// Permission luôn được gắn theo req.user (đã load từ JWT payload lúc authenticate), không hard-code theo role.
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Chưa đăng nhập', 401, 'UNAUTHENTICATED'));
    }

    const hasAll = requiredPermissions.every((p) => req.user.permissions.includes(p));
    if (!hasAll) {
      return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403, 'FORBIDDEN'));
    }

    next();
  };
}

module.exports = authorize;

import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';
import { verifyAccessToken } from '../utils/jwt';
import { loadUserRolesAndPermissions } from '../utils/rbac';
import { asyncHandler } from './asyncHandler';

// Verify JWT (từ cookie httpOnly 'access_token', hoặc header Authorization: Bearer <token> cho client
// không phải trình duyệt) CHỈ để xác thực danh tính (sub = user id) — sau đó tra role/permission HIỆN
// TẠI từ DB cho req.user, KHÔNG tin role/permission cũ có thể từng nhúng trong token. Đánh đổi: mỗi
// request tốn thêm 1 query nhỏ (JOIN qua user_roles/role_permissions, có index) thay vì đọc thẳng từ
// JWT — chấp nhận được vì đây không phải hot path tần suất cực cao, và đổi lại là quyền đổi trong DB có
// hiệu lực ngay ở request tiếp theo (F5), không cần đợi token hết hạn hay đăng xuất/đăng nhập lại.
// Xem ARCHITECTURE.md §10, SECURITY.md §2.
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies?.access_token || bearer;

  if (!token) {
    next(new AppError('Chưa đăng nhập', 401, 'UNAUTHENTICATED'));
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN'));
    return;
  }

  const { roles, permissions } = await loadUserRolesAndPermissions(userId);
  req.user = { id: userId, roles, permissions };
  next();
});

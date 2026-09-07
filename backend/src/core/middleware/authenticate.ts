import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors';
import { verifyAccessToken } from '../utils/jwt';

// Verify JWT (từ cookie httpOnly 'access_token', hoặc header Authorization: Bearer <token>
// cho client không phải trình duyệt) và gắn req.user = { id, roles, permissions }.
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies?.access_token || bearer;

  if (!token) {
    next(new AppError('Chưa đăng nhập', 401, 'UNAUTHENTICATED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, roles: payload.roles, permissions: payload.permissions };
    next();
  } catch {
    next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN'));
  }
}

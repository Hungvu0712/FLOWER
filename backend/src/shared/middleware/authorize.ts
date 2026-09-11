import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors";

// authorize('orders.update_status') hoặc authorize('a.x', 'b.y') — yêu cầu đủ tất cả permission truyền
// vào. Ưu tiên permission-based ("user.block") thay vì hard-code role ("Admin") — xem docs/05 §2.
export function authorize(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Chưa đăng nhập", 401, "UNAUTHENTICATED"));
      return;
    }

    const hasAll = requiredPermissions.every((p) => req.user!.permissions.includes(p));
    if (!hasAll) {
      next(new AppError("Bạn không có quyền thực hiện thao tác này", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
}

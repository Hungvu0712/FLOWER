import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { loadUserRolesAndPermissions } from "../utils/rbac";
import { asyncHandler } from "./asyncHandler";

// Khác `authenticate` — KHÔNG bắt buộc đăng nhập, chỉ điền `req.user` NẾU có token hợp lệ. Dùng cho
// route công khai nhưng muốn biết "ai đang đặt hàng" khi có (guest checkout vẫn đặt được bình thường,
// không có token/token hỏng thì coi như khách vãng lai, KHÔNG trả lỗi). Xem docs/modules/domain-orders.md.
export const attachUserIfPresent = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const token = req.cookies?.access_token || bearer;

    if (!token) {
      next();
      return;
    }

    try {
      const userId = verifyAccessToken(token).sub;
      const { roles, permissions } = await loadUserRolesAndPermissions(userId);
      req.user = { id: userId, roles, permissions };
    } catch {
      // Token hỏng/hết hạn — bỏ qua, tiếp tục như khách vãng lai thay vì chặn request.
    }
    next();
  },
);

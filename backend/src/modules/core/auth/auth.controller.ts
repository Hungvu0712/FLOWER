import type { Response } from "express";
import { asyncHandler } from "../../../shared/middleware";
import { ok } from "../../../shared/response/ApiResponse";
import * as authService from "./auth.service";
import type { AuthSession } from "./auth.service";
import * as auditLog from "../audit-log/auditLog.service";
import { setAuthCookies, clearAuthCookies } from "./cookie.util";
import { requestMeta } from "./device.util";

function respondWithSession(res: Response, session: AuthSession) {
  setAuthCookies(res, session);
  return ok(res, { user: session.user });
}

export const getLoginMethods = asyncHandler(async (_req, res) => {
  const methods = await authService.getLoginMethods();
  ok(res, methods);
});

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  await auditLog.record({
    actorId: user.id,
    action: "auth.register",
    entityType: "user",
    entityId: user.id,
  });
  ok(res, { user }, "Đăng ký thành công, vui lòng đăng nhập.");
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.loginWithPassword(req.body);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

export const requestMagicLink = asyncHandler(async (req, res) => {
  await authService.requestMagicLink(req.body);
  // Luôn trả về thành công dù email có tồn tại hay không, tránh lộ thông tin tài khoản.
  ok(res, null, "Nếu email tồn tại, liên kết đăng nhập đã được gửi.");
});

export const verifyMagicLink = asyncHandler(async (req, res) => {
  const user = await authService.verifyMagicLink(req.body.token);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

export const googleLogin = asyncHandler(async (req, res) => {
  const user = await authService.loginWithGoogle(req.body.idToken);
  const session = await authService.issueSession(user, requestMeta(req));
  respondWithSession(res, session);
});

export const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refreshSession(
    req.cookies?.refresh_token,
    requestMeta(req),
  );
  respondWithSession(res, session);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.refresh_token);
  clearAuthCookies(res);
  ok(res, null, "Đã đăng xuất");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  ok(res, null, "Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.");
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  ok(res, null, "Đặt lại mật khẩu thành công, vui lòng đăng nhập lại.");
});

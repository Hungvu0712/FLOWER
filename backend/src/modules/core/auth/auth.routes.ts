import type { Request } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../../shared/middleware";
import * as controller from "./auth.controller";
import {
  registerSchema,
  loginSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";

export const authRouter = Router();

// Chống brute-force cho các endpoint nhạy cảm — xem docs/07 §1.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
const magicLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// docs/12 BE-16: rate limit trước đây CHỈ theo IP — kẻ tấn công đổi IP liên tục (botnet, proxy xoay
// vòng) nhắm vào ĐÚNG 1 tài khoản nạn nhân thì mỗi IP mới lại có bucket riêng, không bị chặn. Limiter
// này keo THEO EMAIL (độc lập với IP), CHỒNG THÊM lên `authLimiter` theo IP ở trên (không thay thế) —
// 2 lớp bảo vệ 2 kịch bản khác nhau: nhiều tài khoản từ 1 IP (authLimiter) và 1 tài khoản từ nhiều IP
// (limiter này). Không có email trong body (lỗi validate) → rơi về khoá theo IP như hành vi mặc định.
// export riêng để unit test được logic tách khoá rate limit mà không cần dựng cả rate limiter thật.
export function emailKeyGenerator(req: Request): string {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : undefined;
  return email || req.ip || "unknown";
}
const perEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: emailKeyGenerator,
});

authRouter.get("/login-methods", controller.getLoginMethods);
authRouter.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post(
  "/login",
  authLimiter,
  perEmailLimiter,
  validate({ body: loginSchema }),
  controller.login,
);
authRouter.post(
  "/magic-link/request",
  magicLinkLimiter,
  validate({ body: magicLinkRequestSchema }),
  controller.requestMagicLink,
);
authRouter.post(
  "/magic-link/verify",
  validate({ body: magicLinkVerifySchema }),
  controller.verifyMagicLink,
);
authRouter.post(
  "/google",
  authLimiter,
  validate({ body: googleLoginSchema }),
  controller.googleLogin,
);
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);
authRouter.post(
  "/forgot-password",
  authLimiter,
  perEmailLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword,
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword,
);

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../../shared/middleware";
import * as controller from "./contact.controller";
import { createContactMessageSchema } from "./contact.validation";

// Công khai — khách gửi form Liên hệ không cần đăng nhập. Giới hạn tốc độ theo IP để chống spam/abuse
// (giống authLimiter ở modules/core/auth/auth.routes.ts) — form liên hệ không cần lỏng như đăng nhập
// (người dùng thật hiếm khi gửi liên hệ nhiều lần trong ít phút).
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const contactRouter = Router();
contactRouter.post(
  "/",
  contactLimiter,
  validate({ body: createContactMessageSchema }),
  controller.create,
);

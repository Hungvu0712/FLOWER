import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validate } from "../../../shared/middleware";
import * as controller from "./newsletter.controller";
import { subscribeNewsletterSchema, unsubscribeNewsletterSchema } from "./newsletter.validation";

// Công khai — form đăng ký ở footer storefront, không cần đăng nhập. Giới hạn tốc độ theo IP để chống
// spam/abuse — giống contactLimiter ở modules/core/contact/contact.routes.ts.
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export const newsletterRouter = Router();
newsletterRouter.post(
  "/subscribe",
  newsletterLimiter,
  validate({ body: subscribeNewsletterSchema }),
  controller.subscribe,
);
newsletterRouter.post(
  "/unsubscribe",
  newsletterLimiter,
  validate({ body: unsubscribeNewsletterSchema }),
  controller.unsubscribe,
);

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { attachUserIfPresent, validate } from "../../../shared/middleware";
import * as controller from "./orders.controller";
import { createOrderSchema, orderIdParamSchema } from "./orders.validation";

// Công khai — đặt hàng không cần đăng nhập (guest checkout). Giới hạn theo IP chống tạo đơn ảo hàng
// loạt, giống contactLimiter (contact.routes.ts) nhưng nới hơn 1 chút vì checkout hợp lệ có thể phải
// gửi lại sau khi sửa lỗi nhập liệu.
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const ordersRouter = Router();

ordersRouter.post(
  "/",
  createOrderLimiter,
  attachUserIfPresent,
  validate({ body: createOrderSchema }),
  controller.create,
);

// `id` (UUID) đóng vai trò token tra cứu — xem ghi chú ở schema.prisma (model Order). KHÔNG cần đăng
// nhập/quyền gì, ai có link đều xem được, giống trang xác nhận đơn hàng khách của các nền tảng
// thương mại điện tử khác — orderCode chỉ để hiển thị, không dùng làm khoá tra cứu (tránh IDOR).
ordersRouter.get("/:id", validate({ params: orderIdParamSchema }), controller.getById);

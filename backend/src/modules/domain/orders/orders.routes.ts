import { Router } from "express";
import rateLimit from "express-rate-limit";
import { attachUserIfPresent, authorize, validate } from "../../../shared/middleware";
import * as controller from "./orders.controller";
import {
  createOrderSchema,
  orderIdParamSchema,
  listOwnOrdersQuerySchema,
} from "./orders.validation";

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

// docs/12 §5.1 — row-level check cho module domain: khách ĐÃ ĐĂNG NHẬP xem lịch sử đơn của chính
// mình. Router riêng (không gộp vào ordersRouter phía trên) vì mount kèm `authenticate` ở
// routes/v1/index.ts, khác ordersRouter (công khai). `orders.view_own` seed sẵn cho role `member`
// (docs/05 §2.4) — permission tách riêng thay vì chỉ cần `authenticate` (như /account/me) để sau này
// có thể thu hồi quyền xem lịch sử đơn của 1 khách cụ thể mà không phải khoá cả tài khoản.
export const accountOrdersRouter = Router();
accountOrdersRouter.get(
  "/",
  authorize("orders.view_own"),
  validate({ query: listOwnOrdersQuerySchema }),
  controller.listOwn,
);

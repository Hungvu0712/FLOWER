import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./coupons.controller";
import { validateCouponSchema } from "./coupons.validation";

// Công khai — không cần đăng nhập (guest checkout dùng được mã giảm giá). Khách nhập mã ở
// /thanh-toan, gọi endpoint này để xem trước số tiền được giảm TRƯỚC khi đặt hàng thật. Xem
// coupons.admin.routes.ts (CRUD quản trị).
export const couponsRouter = Router();
couponsRouter.post("/validate", validate({ body: validateCouponSchema }), controller.validate);

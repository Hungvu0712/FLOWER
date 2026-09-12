import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { validateCouponSchema } from "./coupons.validation";

// Dùng chung với coupons.admin.openapi.ts.
export const couponValidateResultSchema = z.object({
  code: z.string(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int(),
  discountAmount: z.number().int(),
});

registerRoute({
  method: "post",
  path: "/api/v1/coupons/validate",
  tags: ["Coupons"],
  summary: "Kiểm tra mã giảm giá — dùng ở trang thanh toán TRƯỚC khi đặt hàng thật",
  description:
    "Công khai (guest checkout dùng được mã). KHÔNG tăng lượt dùng — chỉ orders.service.ts mới " +
    "tăng usedCount khi đơn được tạo thật.",
  auth: false,
  request: { body: validateCouponSchema },
  response: { schema: couponValidateResultSchema },
  extraStatuses: [404, 409], // 404 COUPON_NOT_FOUND · 409 hết hạn/chưa tới ngày/hết lượt/dưới đơn tối thiểu/tạm ngưng
});

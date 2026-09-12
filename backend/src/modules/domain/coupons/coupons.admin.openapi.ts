import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
} from "./coupons.validation";

const TAGS = ["Admin · Coupons"];
const PERMISSION = "promotions.manage";

const couponSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int(),
  minOrderValue: z.number().int().nullable(),
  startDate: z.string().datetime().nullable(),
  endDate: z.string().datetime().nullable(),
  usageLimit: z.number().int().nullable(),
  usedCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/coupons",
  tags: TAGS,
  summary: "Danh sách mã giảm giá (phân trang)",
  description:
    "Mặc định CHỈ mã đang hoạt động — `includeInactive=true` để thấy cả mã đã tạm ngưng.",
  auth: { permission: PERMISSION },
  request: { query: listCouponsQuerySchema },
  response: { schema: couponSchema, paginated: true },
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/coupons/{id}",
  tags: TAGS,
  summary: "Chi tiết 1 mã giảm giá",
  auth: { permission: PERMISSION },
  request: { params: couponIdParamSchema },
  response: { schema: couponSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/coupons",
  tags: TAGS,
  summary: "Tạo mã giảm giá",
  auth: { permission: PERMISSION },
  request: { body: createCouponSchema },
  response: { schema: couponSchema },
  extraStatuses: [409], // COUPON_CODE_EXISTS
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/coupons/{id}",
  tags: TAGS,
  summary: "Sửa mã giảm giá",
  auth: { permission: PERMISSION },
  request: { params: couponIdParamSchema, body: updateCouponSchema },
  response: { schema: couponSchema },
  extraStatuses: [404, 409], // 409 COUPON_CODE_EXISTS
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/coupons/{id}",
  tags: TAGS,
  summary: "Xoá mã giảm giá",
  description: "Chặn xoá khi mã ĐÃ TỪNG được dùng (`usedCount > 0`) — trả 409 COUPON_IN_USE.",
  auth: { permission: PERMISSION },
  request: { params: couponIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404, 409],
});

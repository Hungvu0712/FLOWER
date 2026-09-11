import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createOrderSchema,
  orderIdParamSchema,
  listOwnOrdersQuerySchema,
  ORDER_STATUSES,
} from "./orders.validation";

const orderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable().openapi({
    description: "Snapshot tại thời điểm đặt — vẫn giữ dù sản phẩm gốc bị xoá mềm sau đó.",
  }),
  productName: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  subtotal: z.number().int(),
});

// Dùng chung với orders.admin.openapi.ts (GET /admin/orders, .../:id) — cùng ORDER_SELECT ở
// orders.service.ts, export ở đây vì orders.routes.ts (public) tạo đơn đầu tiên.
export const orderSchema = z.object({
  id: z.string().uuid().openapi({ description: "Cũng là token tra cứu công khai — xem GET /orders/{id}." }),
  orderCode: z.string().openapi({ example: "HX2609100001", description: "Chỉ để hiển thị, KHÔNG dùng làm khoá tra cứu." }),
  userId: z.string().uuid().nullable().openapi({ description: "null = guest checkout" }),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.literal("cod"),
  subtotal: z.number().int(),
  total: z.number().int(),
  recipientName: z.string(),
  recipientPhone: z.string(),
  deliveryAddress: z.string(),
  deliveryDate: z.string().openapi({ example: "2026-12-25" }),
  deliveryTimeSlot: z.enum(["sang", "chieu", "toi"]),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(orderItemSchema),
});

registerRoute({
  method: "post",
  path: "/api/v1/orders",
  tags: ["Orders"],
  summary: "Tạo đơn hàng (guest checkout)",
  description:
    "Công khai — rate limit 10/15 phút theo IP. Giá/tên sản phẩm được CHỐT (snapshot) vào đơn tại " +
    "thời điểm đặt. Đã đăng nhập (cookie access_token hợp lệ) thì đơn tự gắn userId.",
  auth: false,
  request: { body: createOrderSchema },
  response: { status: 201, schema: orderSchema },
  extraStatuses: [409, 422], // 409 PRODUCT_UNAVAILABLE · 422 INVALID_SUBMISSION (honeypot)
});

registerRoute({
  method: "get",
  path: "/api/v1/orders/{id}",
  tags: ["Orders"],
  summary: "Tra cứu 1 đơn theo id (công khai)",
  description:
    "`id` (UUID) đóng vai trò TOKEN TRA CỨU — ai có link đều xem được, không cần đăng nhập/quyền gì " +
    "(chống IDOR: orderCode dễ đoán hơn nên KHÔNG dùng làm khoá tra cứu).",
  auth: false,
  request: { params: orderIdParamSchema },
  response: { schema: orderSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "get",
  path: "/api/v1/account/orders",
  tags: ["Orders"],
  summary: "Lịch sử đơn của khách đã đăng nhập (row-level check)",
  description:
    "docs/12 §5.1 — LUÔN lọc theo `userId = req.user.id` ngay trong câu truy vấn, không có tham số " +
    "nào truyền vào để xem đơn người khác. Đơn đặt lúc CHƯA đăng nhập (userId null) không hiện ở đây.",
  auth: { permission: "orders.view_own" },
  request: { query: listOwnOrdersQuerySchema },
  response: { schema: orderSchema, paginated: true },
});

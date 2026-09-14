import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  listDeliveryQueueQuerySchema,
  listOrdersQuerySchema,
  logCallSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./orders.validation";
import { orderSchema } from "./orders.openapi";

const TAGS = ["Admin · Orders"];

// `orderSchema` (orders.openapi.ts) dùng chung với route public GET /orders/{id} (getById), nên KHÔNG
// có 3 field ghi chú cuộc gọi nội bộ — tránh docs gợi ý sai là dữ liệu này lộ ra ngoài. Chỉ những
// response CHẮC CHẮN chỉ admin thấy (list/delivery-queue/log-call — xem ADMIN_ORDER_SELECT ở
// orders.service.ts) mới dùng schema mở rộng này. GET /admin/orders/{id} và PATCH .../status vẫn
// dùng `orderSchema` gốc vì 2 route đó tái dùng CHUNG hàm service với route công khai.
const adminOrderSchema = orderSchema.extend({
  callConfirmedAt: z.string().datetime().nullable().openapi({
    description:
      "Set khi 1 lần gọi được ghi nhận confirmed:true — null = chưa xác nhận qua điện thoại.",
  }),
  lastCallAt: z.string().datetime().nullable(),
  lastCallNote: z.string().nullable(),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/orders/delivery-queue",
  tags: TAGS,
  summary: "Lịch giao hoa theo ngày (dashboard florist)",
  description:
    "Permission RIÊNG `orders.view_delivery_queue` — florist có quyền này nhưng KHÔNG có " +
    "`orders.view_all`. Trả TOÀN BỘ đơn của đúng 1 ngày (`date`), sắp theo khung giờ giao " +
    "(sáng → chiều → tối), loại trừ đơn đã huỷ. Không phân trang (1 ngày hiếm khi có quá nhiều đơn).",
  auth: { permission: "orders.view_delivery_queue" },
  request: { query: listDeliveryQueueQuerySchema },
  response: { schema: z.array(adminOrderSchema) },
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/orders",
  tags: TAGS,
  summary: "Danh sách đơn (phân trang)",
  auth: { permission: "orders.view_all" },
  request: { query: listOrdersQuerySchema },
  response: { schema: adminOrderSchema, paginated: true },
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/orders/{id}",
  tags: TAGS,
  summary: "Chi tiết 1 đơn",
  auth: { permission: "orders.view_all" },
  request: { params: orderIdParamSchema },
  response: { schema: orderSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/orders/{id}/status",
  tags: TAGS,
  summary: "Đổi trạng thái đơn",
  description:
    "Quyền phụ thuộc GIÁ TRỊ `status` gửi lên, không phải 1 permission cố định: " +
    '`status: "cancelled"` cần `orders.cancel`, mọi giá trị khác cần `orders.update_status` ' +
    "(tự kiểm tra trong orders.service.ts, không phải authorize() cố định ở route). " +
    '`status: "confirmed"` còn cần đơn đã được ghi nhận gọi xác nhận (xem POST .../log-call) — ' +
    "chưa gọi thì 409 ORDER_CALL_NOT_CONFIRMED.",
  auth: {},
  request: { params: orderIdParamSchema, body: updateOrderStatusSchema },
  response: { schema: orderSchema },
  // 409 ORDER_STATUS_FINAL (đã completed/cancelled) · 409 ORDER_CANNOT_CANCEL (huỷ đơn đang delivering)
  // · 409 ORDER_CALL_NOT_CONFIRMED (chuyển sang confirmed nhưng chưa ghi nhận cuộc gọi)
  // · 403 FORBIDDEN (thiếu đúng permission cho status đang gửi) · 404 NOT_FOUND
  extraStatuses: [403, 404, 409],
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/orders/{id}/log-call",
  tags: TAGS,
  summary: "Ghi nhận 1 lần gọi điện xác minh đơn",
  description:
    "KHÔNG đổi `status` — chỉ cập nhật 3 field 'mới nhất' (`callConfirmedAt`/`lastCallAt`/`lastCallNote`) " +
    "để hiển thị nhanh, và ghi audit log `order.call_logged`. `confirmed: true` là điều kiện BẮT BUỘC " +
    "trước khi chuyển đơn sang `status: 'confirmed'` (xem PATCH .../status) — lịch sử đầy đủ nhiều lần " +
    "gọi (kể cả không bắt máy) xem qua /superadmin/audit-logs, không có endpoint danh sách riêng.",
  auth: { permission: "orders.update_status" },
  request: { params: orderIdParamSchema, body: logCallSchema },
  response: { schema: adminOrderSchema },
  extraStatuses: [404],
});

import { registerRoute } from "../../../openapi/components";
import { listOrdersQuerySchema, orderIdParamSchema, updateOrderStatusSchema } from "./orders.validation";
import { orderSchema } from "./orders.openapi";

const TAGS = ["Admin · Orders"];

registerRoute({
  method: "get",
  path: "/api/v1/admin/orders",
  tags: TAGS,
  summary: "Danh sách đơn (phân trang)",
  auth: { permission: "orders.view_all" },
  request: { query: listOrdersQuerySchema },
  response: { schema: orderSchema, paginated: true },
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
    "`status: \"cancelled\"` cần `orders.cancel`, mọi giá trị khác cần `orders.update_status` " +
    "(tự kiểm tra trong orders.service.ts, không phải authorize() cố định ở route).",
  auth: {},
  request: { params: orderIdParamSchema, body: updateOrderStatusSchema },
  response: { schema: orderSchema },
  // 409 ORDER_STATUS_FINAL (đã completed/cancelled) · 409 ORDER_CANNOT_CANCEL (huỷ đơn đang delivering)
  // · 403 FORBIDDEN (thiếu đúng permission cho status đang gửi) · 404 NOT_FOUND
  extraStatuses: [403, 404, 409],
});

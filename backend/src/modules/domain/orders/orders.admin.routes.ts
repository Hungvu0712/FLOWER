import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./orders.controller";
import {
  listDeliveryQueueQuerySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./orders.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/orders). KHÁC categories/products
// — KHÔNG `authorize()` một permission cố định cho cả router, vì PATCH .../status cần quyền khác nhau
// tuỳ giá trị `status` (huỷ đơn cần `orders.cancel`, các trạng thái khác cần `orders.update_status` —
// đúng ma trận docs/05 §2.4). 2 route đọc /:id dùng chung `orders.view_all`, PATCH tự kiểm tra quyền
// trong orders.service.ts (updateStatus). Riêng /delivery-queue dùng permission RIÊNG
// `orders.view_delivery_queue` (florist có quyền này nhưng KHÔNG có orders.view_all).
export const ordersAdminRouter = Router();

// PHẢI đặt TRƯỚC '/:id' — Express khớp theo thứ tự khai báo, đặt sau sẽ bị ':id' nuốt mất (rồi
// validate UUID thất bại vì "delivery-queue" không phải UUID) — giống lý do products.routes.ts đặt
// '/:slug' sau '/'.
ordersAdminRouter.get(
  "/delivery-queue",
  authorize("orders.view_delivery_queue"),
  validate({ query: listDeliveryQueueQuerySchema }),
  controller.listDeliveryQueue,
);
ordersAdminRouter.get(
  "/",
  authorize("orders.view_all"),
  validate({ query: listOrdersQuerySchema }),
  controller.listAdmin,
);
ordersAdminRouter.get(
  "/:id",
  authorize("orders.view_all"),
  validate({ params: orderIdParamSchema }),
  controller.getById,
);
ordersAdminRouter.patch(
  "/:id/status",
  validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
  controller.updateStatus,
);

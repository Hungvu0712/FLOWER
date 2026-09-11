import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./orders.controller";
import {
  listOrdersQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from "./orders.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/orders). KHÁC categories/products
// — KHÔNG `authorize()` một permission cố định cho cả router, vì PATCH .../status cần quyền khác nhau
// tuỳ giá trị `status` (huỷ đơn cần `orders.cancel`, các trạng thái khác cần `orders.update_status` —
// đúng ma trận docs/05 §2.4). 2 route đọc dùng chung `orders.view_all`, PATCH tự kiểm tra quyền trong
// orders.service.ts (updateStatus).
export const ordersAdminRouter = Router();

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

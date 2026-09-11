import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./products.controller";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} from "./products.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/products) — yêu cầu permission
// `products.manage` (role admin/super_admin đều có qua domain.seed.ts, không chỉ riêng super_admin).
// Chỉ 1 permission gộp chung (không tách view/create/update/delete như thiết kế ban đầu ở docs/05
// §2.3) — khớp đúng cách categories.manage đang làm, vì sales_staff/florist/shipper chưa cần đụng
// tới màn quản trị sản phẩm này (xem docs/12 nếu sau này cần tách quyền xem riêng cho sales_staff).
export const productsAdminRouter = Router();
productsAdminRouter.use(authorize("products.manage"));

productsAdminRouter.get("/", validate({ query: listProductsQuerySchema }), controller.list);
productsAdminRouter.post("/", validate({ body: createProductSchema }), controller.create);
productsAdminRouter.patch(
  "/:id",
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  controller.update,
);
productsAdminRouter.delete("/:id", validate({ params: productIdParamSchema }), controller.remove);

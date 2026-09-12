import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./coupons.controller";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
} from "./coupons.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/coupons) — yêu cầu permission
// `promotions.manage` (seed sẵn trong domain.seed.ts, chỉ admin/super_admin có — xem docs/05 §2.4).
export const couponsAdminRouter = Router();
couponsAdminRouter.use(authorize("promotions.manage"));

couponsAdminRouter.get("/", validate({ query: listCouponsQuerySchema }), controller.listAdmin);
couponsAdminRouter.get("/:id", validate({ params: couponIdParamSchema }), controller.getById);
couponsAdminRouter.post("/", validate({ body: createCouponSchema }), controller.create);
couponsAdminRouter.patch(
  "/:id",
  validate({ params: couponIdParamSchema, body: updateCouponSchema }),
  controller.update,
);
couponsAdminRouter.delete("/:id", validate({ params: couponIdParamSchema }), controller.remove);

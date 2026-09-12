import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./addresses.controller";
import {
  createAddressSchema,
  updateAddressSchema,
  addressIdParamSchema,
} from "./addresses.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/account/addresses) — CHỈ cần đăng
// nhập, KHÔNG có permission riêng (giống /account/profile) vì đây thuần là dữ liệu cá nhân của user,
// không phải quyền có thể thu hồi độc lập với "là chính mình" (khác /account/orders cần
// orders.view_own — xem docs/modules/domain-addresses.md).
export const addressesRouter = Router();

addressesRouter.get("/", controller.list);
addressesRouter.post("/", validate({ body: createAddressSchema }), controller.create);
addressesRouter.patch(
  "/:id",
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  controller.update,
);
addressesRouter.delete("/:id", validate({ params: addressIdParamSchema }), controller.remove);

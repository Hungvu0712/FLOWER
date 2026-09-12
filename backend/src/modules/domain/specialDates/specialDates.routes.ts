import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./specialDates.controller";
import {
  createSpecialDateSchema,
  updateSpecialDateSchema,
  specialDateIdParamSchema,
} from "./specialDates.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/account/special-dates) — CHỈ cần
// đăng nhập, KHÔNG có permission riêng (giống /account/addresses) vì đây thuần là dữ liệu cá nhân
// của user — xem docs/modules/domain-special-dates.md.
export const specialDatesRouter = Router();

specialDatesRouter.get("/", controller.list);
specialDatesRouter.post("/", validate({ body: createSpecialDateSchema }), controller.create);
specialDatesRouter.patch(
  "/:id",
  validate({ params: specialDateIdParamSchema, body: updateSpecialDateSchema }),
  controller.update,
);
specialDatesRouter.delete(
  "/:id",
  validate({ params: specialDateIdParamSchema }),
  controller.remove,
);

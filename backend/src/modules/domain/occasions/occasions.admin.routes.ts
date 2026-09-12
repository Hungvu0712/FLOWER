import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./occasions.controller";
import {
  createOccasionSchema,
  updateOccasionSchema,
  occasionIdParamSchema,
  listOccasionsQuerySchema,
} from "./occasions.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/occasions) — dùng LẠI permission
// `categories.manage` (mô tả seed sẵn ghi "Thêm/sửa/xoá danh mục, dịp lễ" — xem domain.seed.ts), không
// tách permission riêng `occasions.manage` vì đúng nhóm người quản trị (admin/super_admin) và đúng độ
// nhạy cảm (dữ liệu phân loại/hiển thị, không phải dữ liệu giao dịch) với categories.
export const occasionsAdminRouter = Router();
occasionsAdminRouter.use(authorize("categories.manage"));

occasionsAdminRouter.get("/", validate({ query: listOccasionsQuerySchema }), controller.list);
occasionsAdminRouter.post("/", validate({ body: createOccasionSchema }), controller.create);
occasionsAdminRouter.patch(
  "/:id",
  validate({ params: occasionIdParamSchema, body: updateOccasionSchema }),
  controller.update,
);
occasionsAdminRouter.delete("/:id", validate({ params: occasionIdParamSchema }), controller.remove);

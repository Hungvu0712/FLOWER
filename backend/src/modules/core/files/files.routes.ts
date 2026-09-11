import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./files.controller";
import {
  presignSchema,
  createFileSchema,
  listFilesQuerySchema,
  fileIdParamSchema,
} from "./files.validation";

export const filesRouter = Router();

// Mount với `authenticate` ở app.ts — upload (presign/create) mở cho mọi user đã đăng nhập
// (vd tự đổi avatar); xem/xoá trong màn quản lý tài nguyên yêu cầu quyền `files.manage`.
filesRouter.post("/presign", validate({ body: presignSchema }), controller.presign);
filesRouter.post("/", validate({ body: createFileSchema }), controller.create);
filesRouter.get(
  "/",
  authorize("files.manage"),
  validate({ query: listFilesQuerySchema }),
  controller.list,
);
filesRouter.delete(
  "/:id",
  authorize("files.manage"),
  validate({ params: fileIdParamSchema }),
  controller.remove,
);

import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./folders.controller";
import {
  createFolderSchema,
  updateFolderSchema,
  folderIdParamSchema,
  listFoldersQuerySchema,
} from "./folders.validation";

// Mount với `authenticate` ở app.ts — cùng quyền `files.manage` với module Files (folders là 1 phần
// của màn quản lý tài nguyên, không tách quyền riêng). Xem docs/12 BE-19.
export const foldersRouter = Router();
foldersRouter.use(authorize("files.manage"));

foldersRouter.get("/", validate({ query: listFoldersQuerySchema }), controller.list);
foldersRouter.post("/", validate({ body: createFolderSchema }), controller.create);
foldersRouter.patch(
  "/:id",
  validate({ params: folderIdParamSchema, body: updateFolderSchema }),
  controller.update,
);
foldersRouter.delete("/:id", validate({ params: folderIdParamSchema }), controller.remove);

import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./loginMethods.controller";
import { methodParamSchema, updateBodySchema } from "./loginMethods.validation";

export const loginMethodsRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/superadmin/login-methods) — yêu cầu `settings.manage`.
loginMethodsRouter.use(authorize("settings.manage"));

loginMethodsRouter.get("/", controller.list);
loginMethodsRouter.patch(
  "/:method",
  validate({ params: methodParamSchema, body: updateBodySchema }),
  controller.update,
);

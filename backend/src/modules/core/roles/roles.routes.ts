import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./roles.controller";
import { createRoleSchema, updateRoleSchema, roleIdParamSchema } from "./roles.validation";

export const rolesRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/superadmin/roles) — yêu cầu permission `roles.manage`.
rolesRouter.use(authorize("roles.manage"));

rolesRouter.get("/", controller.list);
rolesRouter.post("/", validate({ body: createRoleSchema }), controller.create);
rolesRouter.patch(
  "/:id",
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  controller.update,
);
rolesRouter.delete("/:id", validate({ params: roleIdParamSchema }), controller.remove);

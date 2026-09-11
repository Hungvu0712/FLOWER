import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./users.controller";
import {
  updateProfileSchema,
  changePasswordSchema,
  sessionIdParamSchema,
} from "./users.validation";

export const usersRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/account) — mọi route ở đây yêu cầu đã đăng nhập.
usersRouter.get("/me", controller.getMe);
usersRouter.patch("/profile", validate({ body: updateProfileSchema }), controller.updateProfile);
usersRouter.post(
  "/change-password",
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);
usersRouter.get("/sessions", controller.listSessions);
usersRouter.delete(
  "/sessions/:id",
  validate({ params: sessionIdParamSchema }),
  controller.revokeSession,
);
usersRouter.delete("/sessions", controller.revokeOtherSessions);

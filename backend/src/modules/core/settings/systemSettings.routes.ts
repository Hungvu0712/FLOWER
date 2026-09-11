import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./systemSettings.controller";
import { settingKeyParamSchema, updateSettingBodySchema } from "./systemSettings.validation";

export const systemSettingsRouter = Router();

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/superadmin/settings) — dùng chung
// permission `settings.manage` với module Login Methods (cùng thuộc "cài đặt hệ thống").
systemSettingsRouter.use(authorize("settings.manage"));

systemSettingsRouter.get("/", controller.list);
systemSettingsRouter.patch(
  "/:key",
  validate({ params: settingKeyParamSchema, body: updateSettingBodySchema }),
  controller.update,
);

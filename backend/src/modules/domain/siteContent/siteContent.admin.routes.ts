import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./siteContent.controller";
import { siteContentKeyParamSchema, updateSiteContentBodySchema } from "./siteContent.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/site-content) — permission
// `site_content.manage` riêng, KHÁC `settings.manage` (system_settings, chỉ super_admin) vì đây là
// nội dung cửa hàng mà admin thường cũng cần sửa được — xem docs/05 §2.4.
export const siteContentAdminRouter = Router();
siteContentAdminRouter.use(authorize("site_content.manage"));

siteContentAdminRouter.patch(
  "/:key",
  validate({ params: siteContentKeyParamSchema, body: updateSiteContentBodySchema }),
  controller.update,
);

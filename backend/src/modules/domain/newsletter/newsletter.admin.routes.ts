import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./newsletter.controller";
import {
  listNewsletterQuerySchema,
  newsletterSubscriberIdParamSchema,
} from "./newsletter.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/newsletter) — DÙNG LẠI permission
// `blog.manage` (cùng nhóm "Nội dung", không tách permission riêng — xem docs/05 §2.4).
export const newsletterAdminRouter = Router();
newsletterAdminRouter.use(authorize("blog.manage"));

newsletterAdminRouter.get(
  "/",
  validate({ query: listNewsletterQuerySchema }),
  controller.listAdmin,
);
newsletterAdminRouter.delete(
  "/:id",
  validate({ params: newsletterSubscriberIdParamSchema }),
  controller.remove,
);

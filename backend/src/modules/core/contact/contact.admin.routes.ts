import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./contact.controller";
import {
  listContactMessagesQuerySchema,
  contactMessageIdParamSchema,
  updateContactMessageSchema,
} from "./contact.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/contact-messages) — yêu cầu
// permission `contact.manage` (core, gán sẵn cho admin/super_admin qua core.seed.ts).
export const contactAdminRouter = Router();
contactAdminRouter.use(authorize("contact.manage"));

contactAdminRouter.get("/", validate({ query: listContactMessagesQuerySchema }), controller.list);
contactAdminRouter.patch(
  "/:id",
  validate({ params: contactMessageIdParamSchema, body: updateContactMessageSchema }),
  controller.update,
);

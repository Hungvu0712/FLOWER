import { registerRoute } from "../../../openapi/components";
import {
  listContactMessagesQuerySchema,
  contactMessageIdParamSchema,
  updateContactMessageSchema,
} from "./contact.validation";
import { contactMessageSchema } from "./contact.openapi";

const TAGS = ["Admin · Contact Messages"];
const PERMISSION = "contact.manage";

registerRoute({
  method: "get",
  path: "/api/v1/admin/contact-messages",
  tags: TAGS,
  summary: "Danh sách tin nhắn liên hệ (phân trang)",
  auth: { permission: PERMISSION },
  request: { query: listContactMessagesQuerySchema },
  response: { schema: contactMessageSchema, paginated: true },
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/contact-messages/{id}",
  tags: TAGS,
  summary: "Đánh dấu đã/chưa xử lý",
  auth: { permission: PERMISSION },
  request: { params: contactMessageIdParamSchema, body: updateContactMessageSchema },
  response: { schema: contactMessageSchema },
  extraStatuses: [404],
});

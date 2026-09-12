import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  listNewsletterQuerySchema,
  newsletterSubscriberIdParamSchema,
} from "./newsletter.validation";

const TAGS = ["Admin · Newsletter"];
const PERMISSION = "blog.manage";

const newsletterSubscriberSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  isActive: z.boolean(),
  subscribedAt: z.string().datetime(),
  unsubscribedAt: z.string().datetime().nullable(),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/newsletter",
  tags: TAGS,
  summary: "Danh sách người đăng ký nhận tin (phân trang)",
  auth: { permission: PERMISSION },
  request: { query: listNewsletterQuerySchema },
  response: { schema: newsletterSubscriberSchema, paginated: true },
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/newsletter/{id}",
  tags: TAGS,
  summary: "Xoá hẳn 1 người đăng ký (khác unsubscribe — xoá THẬT khỏi DB)",
  auth: { permission: PERMISSION },
  request: { params: newsletterSubscriberIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

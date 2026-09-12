import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { subscribeNewsletterSchema, unsubscribeNewsletterSchema } from "./newsletter.validation";

registerRoute({
  method: "post",
  path: "/api/v1/newsletter/subscribe",
  tags: ["Newsletter"],
  summary: "Đăng ký nhận email khuyến mãi/tin mới",
  description: "Công khai, rate limit 5/15 phút theo IP. Idempotent — đăng ký lại không lỗi.",
  auth: false,
  request: { body: subscribeNewsletterSchema },
  response: { schema: z.null(), description: "Đã đăng ký nhận tin" },
});

registerRoute({
  method: "post",
  path: "/api/v1/newsletter/unsubscribe",
  tags: ["Newsletter"],
  summary: "Hủy đăng ký nhận email",
  description:
    "Công khai, rate limit 5/15 phút theo IP. Luôn trả thành công bất kể email có từng đăng ký hay " +
    "không (không xác nhận/phủ nhận qua response).",
  auth: false,
  request: { body: unsubscribeNewsletterSchema },
  response: { schema: z.null(), description: "Đã hủy đăng ký nhận tin" },
});

import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { createContactMessageSchema } from "./contact.validation";

// Dùng chung với contact.admin.openapi.ts (GET/PATCH /admin/contact-messages) — cùng 1 bảng
// contact_messages, export ở đây vì contact.routes.ts (POST công khai) là nơi tạo bản ghi gốc.
export const contactMessageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().nullable(),
  message: z.string(),
  isHandled: z.boolean(),
  createdAt: z.string().datetime(),
});

registerRoute({
  method: "post",
  path: "/api/v1/contact",
  tags: ["Contact"],
  summary: "Khách gửi form Liên hệ",
  description:
    "Công khai, rate limit 5/15 phút theo IP. Ghi DB trước, gửi email thông báo tới CONTACT_EMAIL " +
    "là best-effort (lỗi gửi mail không làm hỏng response).",
  auth: false,
  request: { body: createContactMessageSchema },
  response: {
    status: 201,
    schema: contactMessageSchema,
    description: "Đã gửi liên hệ, chúng tôi sẽ phản hồi sớm nhất",
  },
});

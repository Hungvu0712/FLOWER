import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { SITE_CONTENT_KEYS } from "./siteContent.validation";

const TAGS = ["Site Content"];

export const siteContentSchema = z.object({
  key: z.enum(SITE_CONTENT_KEYS),
  value: z.unknown().openapi({
    description:
      "Kiểu THẬT tuỳ key. hotline/address/open_hours: string. zalo_link: string (URL). " +
      "hero_banner: KHÁC NHAU giữa đọc và ghi — PATCH nhận uuid|null (id file, xem POST /files), " +
      "GET/response trả { fileId, url } | null (đã join thêm url để hiển thị).",
  }),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/site-content",
  tags: TAGS,
  summary: "Nội dung storefront (banner Hero, hotline, Zalo, địa chỉ, giờ mở cửa)",
  description: "Công khai — dùng cho Hero, Footer, trang Liên hệ... Sửa xem PATCH /admin/site-content/{key}.",
  auth: false,
  response: { schema: z.array(siteContentSchema) },
});

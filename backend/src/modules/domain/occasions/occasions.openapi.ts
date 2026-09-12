import { z } from "zod";
import { registerRoute } from "../../../openapi/components";

// Dùng chung với occasions.admin.openapi.ts — export ở đây vì occasions.routes.ts (public) là bản
// storefront. Khác categories/products, Occasion không có trường "nội bộ" nào cần giấu (không giá,
// không ảnh) nên public schema chỉ thiếu sortOrder/isActive/timestamps, không thiếu trường nghiệp vụ.
export const publicOccasionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

registerRoute({
  method: "get",
  path: "/api/v1/occasions",
  tags: ["Occasions"],
  summary: "Dịp lễ đang bật (cho storefront)",
  description: "Chỉ trả trường cần hiển thị — không lộ sortOrder/timestamps nội bộ.",
  auth: false,
  response: { schema: z.array(publicOccasionSchema) },
});

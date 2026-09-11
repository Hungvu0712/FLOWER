import { z } from "zod";
import { registerRoute } from "../../../openapi/components";

// Dùng chung với categories.admin.openapi.ts — export ở đây vì categories.routes.ts (public) là bản
// storefront, categories.admin.routes.ts thêm sortOrder/isActive/timestamps/_count.
export const publicCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  parentId: z.string().uuid().nullable(),
  imageFile: z.object({ url: z.string().url() }).nullable(),
});

registerRoute({
  method: "get",
  path: "/api/v1/categories",
  tags: ["Categories"],
  summary: "Danh mục đang bật (cho storefront)",
  description: "Chỉ trả trường cần hiển thị — không lộ sortOrder/timestamps nội bộ.",
  auth: false,
  response: { schema: z.array(publicCategorySchema) },
});

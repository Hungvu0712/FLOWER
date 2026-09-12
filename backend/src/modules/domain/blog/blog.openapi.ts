import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { blogPostSlugParamSchema, listBlogPostsQuerySchema } from "./blog.validation";

// Dùng chung với blog.admin.openapi.ts — cùng shape cho public/admin (khác categories tách riêng
// public/admin schema) vì blog KHÔNG có trường nội bộ nào cần giấu ngoài publishedAt = null (draft,
// bản thân việc null/có giá trị đã tự nói lên trạng thái, không cần trường ẩn riêng).
export const blogPostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: z.object({ id: z.string().uuid(), fullName: z.string() }).nullable(),
  thumbnailFile: z.object({ id: z.string().uuid(), url: z.string().url() }).nullable(),
});

registerRoute({
  method: "get",
  path: "/api/v1/blog",
  tags: ["Blog"],
  summary: "Bài viết ĐÃ XUẤT BẢN (cho storefront, phân trang)",
  description: "`publishedAt <= now()` — bài lên lịch xuất bản tương lai chưa hiện ở đây.",
  auth: false,
  request: { query: listBlogPostsQuerySchema },
  response: { schema: blogPostSchema, paginated: true },
});

registerRoute({
  method: "get",
  path: "/api/v1/blog/{slug}",
  tags: ["Blog"],
  summary: "Chi tiết 1 bài viết đã xuất bản",
  auth: false,
  request: { params: blogPostSlugParamSchema },
  response: { schema: blogPostSchema },
  extraStatuses: [404],
});

import { z } from "zod";

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề").max(200),
  slug: z.string().trim().min(1).max(200).optional(), // bỏ trống thì tự sinh từ title (xem blog.service.ts)
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().min(1, "Vui lòng nhập nội dung"),
  thumbnailFileId: z.string().uuid().nullable().optional(),
  // null/bỏ trống = draft (chưa xuất bản). Có giá trị = xuất bản NGAY (chọn thời điểm hiện tại) hoặc
  // LÊN LỊCH xuất bản tương lai — public chỉ thấy khi publishedAt <= now(), xem blog.service.ts.
  publishedAt: z.string().datetime().nullable().optional(),
});
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = createBlogPostSchema.partial();
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

export const blogPostIdParamSchema = z.object({ id: z.string().uuid() });
export const blogPostSlugParamSchema = z.object({ slug: z.string().min(1) });

export const listBlogPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListBlogPostsQuery = z.infer<typeof listBlogPostsQuerySchema>;

// Quản trị — mặc định lấy CẢ draft lẫn đã xuất bản (khác listPublic() luôn chỉ đã xuất bản).
export const listAdminBlogPostsQuerySchema = listBlogPostsQuerySchema;
export type ListAdminBlogPostsQuery = z.infer<typeof listAdminBlogPostsQuerySchema>;

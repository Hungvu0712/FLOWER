import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  blogPostIdParamSchema,
  createBlogPostSchema,
  listAdminBlogPostsQuerySchema,
  updateBlogPostSchema,
} from "./blog.validation";
import { blogPostSchema } from "./blog.openapi";

const TAGS = ["Admin · Blog"];
const PERMISSION = "blog.manage";

registerRoute({
  method: "get",
  path: "/api/v1/admin/blog",
  tags: TAGS,
  summary: "Danh sách bài viết (phân trang)",
  description: "Lấy CẢ draft (`publishedAt: null`) lẫn đã xuất bản — khác `GET /blog` công khai.",
  auth: { permission: PERMISSION },
  request: { query: listAdminBlogPostsQuerySchema },
  response: { schema: blogPostSchema, paginated: true },
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/blog",
  tags: TAGS,
  summary: "Tạo bài viết",
  description:
    "Bỏ trống `slug` → tự sinh từ `title` (bỏ dấu tiếng Việt), trùng thì tự thêm hậu tố `-2`, `-3`... " +
    "`content` được sanitize lại bằng allowlist thẻ trước khi lưu (giống Products). Bỏ trống " +
    "`publishedAt` → lưu ở dạng draft.",
  auth: { permission: PERMISSION },
  request: { body: createBlogPostSchema },
  response: { status: 201, schema: blogPostSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/blog/{id}",
  tags: TAGS,
  summary: "Sửa bài viết",
  auth: { permission: PERMISSION },
  request: { params: blogPostIdParamSchema, body: updateBlogPostSchema },
  response: { schema: blogPostSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/blog/{id}",
  tags: TAGS,
  summary: "Xoá bài viết",
  description: "Soft delete (`deletedAt`) — giống Products, khác Categories (hard delete).",
  auth: { permission: PERMISSION },
  request: { params: blogPostIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

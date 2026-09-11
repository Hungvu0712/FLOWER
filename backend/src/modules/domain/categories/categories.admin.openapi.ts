import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "./categories.validation";
import { publicCategorySchema } from "./categories.openapi";

const TAGS = ["Admin · Categories"];
const PERMISSION = "categories.manage";

const categorySchema = publicCategorySchema.extend({
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  _count: z.object({ children: z.number().int() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/categories",
  tags: TAGS,
  summary: "Danh sách đầy đủ danh mục",
  auth: { permission: PERMISSION },
  request: { query: listCategoriesQuerySchema },
  response: { schema: z.array(categorySchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/categories",
  tags: TAGS,
  summary: "Tạo danh mục",
  description:
    "Bỏ trống `slug` → tự sinh từ `name` (bỏ dấu tiếng Việt), trùng thì tự thêm hậu tố `-2`, `-3`... " +
    "Đổi `name` sau này KHÔNG tự đổi `slug` — tránh gãy link đã chia sẻ.",
  auth: { permission: PERMISSION },
  request: { body: createCategorySchema },
  response: { status: 201, schema: categorySchema },
  extraStatuses: [400, 404], // 400 CATEGORY_CYCLE · 404 PARENT_NOT_FOUND
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/categories/{id}",
  tags: TAGS,
  summary: "Sửa danh mục",
  auth: { permission: PERMISSION },
  request: { params: categoryIdParamSchema, body: updateCategorySchema },
  response: { schema: categorySchema },
  extraStatuses: [400, 404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/categories/{id}",
  tags: TAGS,
  summary: "Xoá danh mục",
  description: "Hard delete — khác Products (soft delete, xem products.admin.openapi.ts).",
  auth: { permission: PERMISSION },
  request: { params: categoryIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404, 409], // 409 CATEGORY_HAS_CHILDREN
});

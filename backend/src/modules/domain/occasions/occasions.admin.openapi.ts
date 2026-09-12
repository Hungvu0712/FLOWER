import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createOccasionSchema,
  updateOccasionSchema,
  occasionIdParamSchema,
  listOccasionsQuerySchema,
} from "./occasions.validation";
import { publicOccasionSchema } from "./occasions.openapi";

const TAGS = ["Admin · Occasions"];
const PERMISSION = "categories.manage";

const occasionSchema = publicOccasionSchema.extend({
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/occasions",
  tags: TAGS,
  summary: "Danh sách đầy đủ dịp lễ",
  auth: { permission: PERMISSION },
  request: { query: listOccasionsQuerySchema },
  response: { schema: z.array(occasionSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/occasions",
  tags: TAGS,
  summary: "Tạo dịp lễ",
  description:
    "Bỏ trống `slug` → tự sinh từ `name` (bỏ dấu tiếng Việt), trùng thì tự thêm hậu tố `-2`, `-3`... " +
    "Đổi `name` sau này KHÔNG tự đổi `slug` — tránh gãy link đã chia sẻ.",
  auth: { permission: PERMISSION },
  request: { body: createOccasionSchema },
  response: { status: 201, schema: occasionSchema },
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/occasions/{id}",
  tags: TAGS,
  summary: "Sửa dịp lễ",
  auth: { permission: PERMISSION },
  request: { params: occasionIdParamSchema, body: updateOccasionSchema },
  response: { schema: occasionSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/occasions/{id}",
  tags: TAGS,
  summary: "Xoá dịp lễ",
  description:
    "Hard delete. Sản phẩm đang gắn dịp lễ này chỉ bị GỠ TAG (product_occasions xoá theo " +
    "onDelete: Cascade), không ảnh hưởng gì khác tới sản phẩm — khác Categories (chặn xoá khi còn " +
    "danh mục con).",
  auth: { permission: PERMISSION },
  request: { params: occasionIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

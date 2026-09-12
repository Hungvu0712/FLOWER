import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  listAdminReviewsQuerySchema,
  moderateReviewSchema,
  reviewIdParamSchema,
} from "./reviews.validation";
import { publicReviewSchema } from "./reviews.openapi";

const TAGS = ["Admin · Reviews"];
const PERMISSION = "reviews.moderate";

const adminReviewSchema = publicReviewSchema.extend({
  productId: z.string().uuid(),
  isApproved: z.boolean(),
  updatedAt: z.string().datetime(),
  product: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/reviews",
  tags: TAGS,
  summary: "Hàng đợi duyệt đánh giá",
  description:
    "Mặc định lấy CẢ chờ duyệt lẫn đã duyệt — lọc `isApproved=false` để chỉ xem hàng đợi cần duyệt.",
  auth: { permission: PERMISSION },
  request: { query: listAdminReviewsQuerySchema },
  response: { schema: adminReviewSchema, paginated: true },
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/reviews/{id}",
  tags: TAGS,
  summary: "Duyệt / ẩn đánh giá",
  description: "`isApproved: true` → hiện công khai. `isApproved: false` → ẩn khỏi storefront.",
  auth: { permission: PERMISSION },
  request: { params: reviewIdParamSchema, body: moderateReviewSchema },
  response: { schema: adminReviewSchema },
  extraStatuses: [404],
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/reviews/{id}",
  tags: TAGS,
  summary: "Xoá đánh giá",
  auth: { permission: PERMISSION },
  request: { params: reviewIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

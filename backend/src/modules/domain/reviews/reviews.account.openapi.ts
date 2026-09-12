import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { createReviewSchema, listOwnReviewsQuerySchema } from "./reviews.validation";
import { publicReviewSchema } from "./reviews.openapi";

const TAGS = ["Account · Reviews"];

const ownReviewSchema = publicReviewSchema.extend({
  productId: z.string().uuid(),
  isApproved: z.boolean(),
  updatedAt: z.string().datetime(),
  product: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/account/reviews",
  tags: TAGS,
  summary: "Đánh giá của chính mình (kể cả đang chờ duyệt)",
  auth: {},
  request: { query: listOwnReviewsQuerySchema },
  response: { schema: ownReviewSchema, paginated: true },
});

registerRoute({
  method: "post",
  path: "/api/v1/account/reviews",
  tags: TAGS,
  summary: "Viết đánh giá sản phẩm",
  description:
    "Mặc định `isApproved: false` (chờ duyệt) — CHƯA hiện công khai tới khi admin duyệt qua " +
    "`PATCH /admin/reviews/{id}`. Mỗi user chỉ đánh giá 1 lần/sản phẩm.",
  auth: {},
  request: { body: createReviewSchema },
  response: { status: 201, schema: ownReviewSchema },
  extraStatuses: [404, 409], // 404 PRODUCT_NOT_FOUND · 409 REVIEW_ALREADY_EXISTS
});

import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { listReviewsQuerySchema } from "./reviews.validation";

// Dùng chung với reviews.account.openapi.ts / reviews.admin.openapi.ts.
export const publicReviewSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
  user: z.object({ id: z.string().uuid(), fullName: z.string() }),
});

registerRoute({
  method: "get",
  path: "/api/v1/reviews",
  tags: ["Reviews"],
  summary: "Đánh giá ĐÃ DUYỆT của 1 sản phẩm (cho storefront, phân trang)",
  auth: false,
  request: { query: listReviewsQuerySchema },
  response: { schema: publicReviewSchema, paginated: true },
});

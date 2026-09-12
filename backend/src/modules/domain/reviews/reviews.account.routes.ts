import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./reviews.controller";
import { createReviewSchema, listOwnReviewsQuerySchema } from "./reviews.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/account/reviews) — CHỈ cần đăng
// nhập để VIẾT đánh giá của MÌNH, KHÔNG permission riêng (giống addresses/wishlist — xem
// docs/modules/domain-addresses.md §1). Duyệt/xoá đánh giá của người khác cần `reviews.moderate` —
// xem reviews.admin.routes.ts.
export const accountReviewsRouter = Router();

accountReviewsRouter.get("/", validate({ query: listOwnReviewsQuerySchema }), controller.listOwn);
accountReviewsRouter.post("/", validate({ body: createReviewSchema }), controller.create);

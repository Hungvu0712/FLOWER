import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./reviews.controller";
import {
  listAdminReviewsQuerySchema,
  moderateReviewSchema,
  reviewIdParamSchema,
} from "./reviews.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/reviews) — yêu cầu permission
// `reviews.moderate` (seed sẵn, chỉ admin/super_admin có — xem domain.seed.ts, docs/05 §2.4).
export const reviewsAdminRouter = Router();
reviewsAdminRouter.use(authorize("reviews.moderate"));

reviewsAdminRouter.get("/", validate({ query: listAdminReviewsQuerySchema }), controller.listAdmin);
reviewsAdminRouter.patch(
  "/:id",
  validate({ params: reviewIdParamSchema, body: moderateReviewSchema }),
  controller.moderate,
);
reviewsAdminRouter.delete("/:id", validate({ params: reviewIdParamSchema }), controller.remove);

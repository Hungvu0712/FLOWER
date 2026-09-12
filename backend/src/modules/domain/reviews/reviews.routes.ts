import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./reviews.controller";
import { listReviewsQuerySchema } from "./reviews.validation";

// Công khai — storefront hiện đánh giá ĐÃ DUYỆT của 1 sản phẩm. Xem reviews.account.routes.ts (tạo
// đánh giá) và reviews.admin.routes.ts (duyệt).
export const reviewsRouter = Router();
reviewsRouter.get("/", validate({ query: listReviewsQuerySchema }), controller.listPublic);

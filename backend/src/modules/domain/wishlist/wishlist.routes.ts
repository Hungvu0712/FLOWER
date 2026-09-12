import { Router } from "express";
import { validate } from "../../../shared/middleware";
import * as controller from "./wishlist.controller";
import { addWishlistSchema, wishlistProductIdParamSchema } from "./wishlist.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/account/wishlist) — CHỈ cần đăng
// nhập, KHÔNG permission riêng, giống addresses.routes.ts (dữ liệu cá nhân, không có kịch bản thu
// hồi quyền độc lập với "là chính mình" — xem docs/modules/domain-addresses.md §1).
export const wishlistRouter = Router();

wishlistRouter.get("/", controller.list);
wishlistRouter.post("/", validate({ body: addWishlistSchema }), controller.add);
wishlistRouter.delete(
  "/:productId",
  validate({ params: wishlistProductIdParamSchema }),
  controller.remove,
);

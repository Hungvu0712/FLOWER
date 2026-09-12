import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./wishlist.service";
import type { AddWishlistInput } from "./wishlist.validation";

export const list = asyncHandler(async (req, res) => {
  const items = await service.list(req.user!.id);
  ok(res, items);
});

export const add = asyncHandler(async (req, res) => {
  const { productId } = req.body as AddWishlistInput;
  const item = await service.add(req.user!.id, productId);
  created(res, item);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.productId as string);
  ok(res, null, "Đã gỡ khỏi danh sách yêu thích");
});

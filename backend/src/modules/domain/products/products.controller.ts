import { asyncHandler } from "../../../shared/middleware";
import { ok, created, paginated } from "../../../shared/response/ApiResponse";
import * as service from "./products.service";
import type { ListProductsQuery } from "./products.validation";

export const listPublic = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPublic(req.query as unknown as ListProductsQuery);
  paginated(res, items, meta);
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.list(req.query as unknown as ListProductsQuery);
  paginated(res, items, meta);
});

export const create = asyncHandler(async (req, res) => {
  const product = await service.create(req.user!.id, req.body, req.ip);
  created(res, product);
});

export const update = asyncHandler(async (req, res) => {
  const product = await service.update(req.user!.id, req.params.id as string, req.body, req.ip);
  ok(res, product);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá sản phẩm");
});

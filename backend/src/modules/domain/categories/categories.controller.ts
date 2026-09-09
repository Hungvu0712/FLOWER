import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./categories.service";
import type { ListCategoriesQuery } from "./categories.validation";

export const listPublic = asyncHandler(async (_req, res) => {
  const categories = await service.listPublic();
  ok(res, categories);
});

export const list = asyncHandler(async (req, res) => {
  const categories = await service.list(
    req.query as unknown as ListCategoriesQuery,
  );
  ok(res, categories);
});

export const create = asyncHandler(async (req, res) => {
  const category = await service.create(req.user!.id, req.body, req.ip);
  created(res, category);
});

export const update = asyncHandler(async (req, res) => {
  const category = await service.update(
    req.user!.id,
    req.params.id as string,
    req.body,
    req.ip,
  );
  ok(res, category);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá danh mục");
});

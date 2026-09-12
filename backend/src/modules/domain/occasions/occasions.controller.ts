import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./occasions.service";
import type { ListOccasionsQuery } from "./occasions.validation";

export const listPublic = asyncHandler(async (_req, res) => {
  const occasions = await service.listPublic();
  ok(res, occasions);
});

export const list = asyncHandler(async (req, res) => {
  const occasions = await service.list(req.query as unknown as ListOccasionsQuery);
  ok(res, occasions);
});

export const create = asyncHandler(async (req, res) => {
  const occasion = await service.create(req.user!.id, req.body, req.ip);
  created(res, occasion);
});

export const update = asyncHandler(async (req, res) => {
  const occasion = await service.update(req.user!.id, req.params.id as string, req.body, req.ip);
  ok(res, occasion);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá dịp lễ");
});

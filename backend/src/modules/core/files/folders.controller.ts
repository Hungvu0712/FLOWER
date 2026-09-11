import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./folders.service";
import type { ListFoldersQuery } from "./folders.validation";

export const list = asyncHandler(async (req, res) => {
  const folders = await service.list(req.query as unknown as ListFoldersQuery);
  ok(res, folders);
});

export const create = asyncHandler(async (req, res) => {
  const folder = await service.create(req.user!.id, req.body, req.ip);
  created(res, folder);
});

export const update = asyncHandler(async (req, res) => {
  const folder = await service.update(req.user!.id, req.params.id as string, req.body, req.ip);
  ok(res, folder);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, "Đã xoá thư mục");
});

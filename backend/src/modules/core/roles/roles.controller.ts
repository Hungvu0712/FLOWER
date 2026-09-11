import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./roles.service";

export const list = asyncHandler(async (_req, res) => {
  const roles = await service.list();
  ok(res, roles);
});

export const create = asyncHandler(async (req, res) => {
  const role = await service.create(req.user!.id, req.body, req.ip);
  created(res, role);
});

export const update = asyncHandler(async (req, res) => {
  const role = await service.update(req.user!.id, Number(req.params.id), req.body, req.ip);
  ok(res, role);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, Number(req.params.id), req.ip);
  ok(res, null, "Đã xoá role");
});

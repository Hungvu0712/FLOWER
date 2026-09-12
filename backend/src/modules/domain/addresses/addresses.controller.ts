import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./addresses.service";

export const list = asyncHandler(async (req, res) => {
  const addresses = await service.list(req.user!.id);
  ok(res, addresses);
});

export const create = asyncHandler(async (req, res) => {
  const address = await service.create(req.user!.id, req.body);
  created(res, address);
});

export const update = asyncHandler(async (req, res) => {
  const address = await service.update(req.user!.id, req.params.id as string, req.body);
  ok(res, address);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string);
  ok(res, null, "Đã xoá địa chỉ");
});

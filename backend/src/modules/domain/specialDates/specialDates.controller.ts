import { asyncHandler } from "../../../shared/middleware";
import { ok, created } from "../../../shared/response/ApiResponse";
import * as service from "./specialDates.service";

export const list = asyncHandler(async (req, res) => {
  const dates = await service.list(req.user!.id);
  ok(res, dates);
});

export const create = asyncHandler(async (req, res) => {
  const date = await service.create(req.user!.id, req.body);
  created(res, date);
});

export const update = asyncHandler(async (req, res) => {
  const date = await service.update(req.user!.id, req.params.id as string, req.body);
  ok(res, date);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, req.params.id as string);
  ok(res, null, "Đã xoá ngày đặc biệt");
});

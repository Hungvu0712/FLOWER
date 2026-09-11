import { asyncHandler } from "../../../shared/middleware";
import { ok } from "../../../shared/response/ApiResponse";
import * as service from "./systemSettings.service";
import type { SettingKey } from "./systemSettings.validation";

export const list = asyncHandler(async (_req, res) => {
  ok(res, await service.list());
});

export const update = asyncHandler(async (req, res) => {
  const updated = await service.update(
    req.user!.id,
    req.params.key as SettingKey,
    req.body.value,
    req.ip,
  );
  ok(res, updated);
});

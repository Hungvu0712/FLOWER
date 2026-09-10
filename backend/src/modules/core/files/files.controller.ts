import { asyncHandler } from "../../../shared/middleware";
import { ok, created, paginated } from "../../../shared/response/ApiResponse";
import * as filesService from "./files.service";
import type { ListFilesQuery } from "./files.validation";

export const presign = asyncHandler(async (req, res) => {
  const result = await filesService.getPresignedUploadUrl(req.body);
  ok(res, result);
});

export const create = asyncHandler(async (req, res) => {
  const file = await filesService.createFileRecord(req.body, req.user!.id);
  created(res, file);
});

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await filesService.listFiles(
    req.query as unknown as ListFilesQuery,
  );
  paginated(res, items, meta);
});

export const remove = asyncHandler(async (req, res) => {
  await filesService.softDeleteFile(req.params.id as string);
  ok(res, null, "Đã xoá file");
});

import { asyncHandler } from '../../../core/middleware';
import { ok, created } from '../../../core/response/ApiResponse';
import * as service from './permissions.service';
import type { ListPermissionsQuery } from './permissions.validation';

export const list = asyncHandler(async (req, res) => {
  const permissions = await service.list(req.query as unknown as ListPermissionsQuery);
  ok(res, permissions);
});

export const create = asyncHandler(async (req, res) => {
  const permission = await service.create(req.user!.id, req.body, req.ip);
  created(res, permission);
});

export const update = asyncHandler(async (req, res) => {
  const permission = await service.update(req.user!.id, Number(req.params.id), req.body, req.ip);
  ok(res, permission);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user!.id, Number(req.params.id), req.ip);
  ok(res, null, 'Đã xoá permission');
});

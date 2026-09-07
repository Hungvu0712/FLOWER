import { asyncHandler } from '../../../core/middleware';
import { ok } from '../../../core/response/ApiResponse';
import * as service from './loginMethods.service';

export const list = asyncHandler(async (_req, res) => {
  const methods = await service.list();
  ok(res, methods);
});

export const update = asyncHandler(async (req, res) => {
  const method = await service.update(req.user!.id, req.params.method as string, req.body.isEnabled, req.ip);
  ok(res, method);
});

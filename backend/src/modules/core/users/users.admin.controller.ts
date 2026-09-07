import { asyncHandler } from '../../../core/middleware';
import { ok, paginated } from '../../../core/response/ApiResponse';
import * as service from './users.admin.service';
import type { ListUsersQuery } from './users.admin.validation';

export const list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listUsers(req.query as unknown as ListUsersQuery);
  paginated(res, items, meta);
});

export const block = asyncHandler(async (req, res) => {
  await service.setBlocked(req.user!.id, req.params.id as string, true, req.ip);
  ok(res, null, 'Đã khoá tài khoản');
});

export const unblock = asyncHandler(async (req, res) => {
  await service.setBlocked(req.user!.id, req.params.id as string, false, req.ip);
  ok(res, null, 'Đã mở khoá tài khoản');
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDeleteUser(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, 'Đã xoá tài khoản');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await service.resetPassword(req.user!.id, req.params.id as string, req.ip);
  ok(res, null, 'Đã gửi mật khẩu mới qua email');
});

export const updateRole = asyncHandler(async (req, res) => {
  await service.updateRole(req.user!.id, req.params.id as string, req.body.roleCode, req.ip);
  ok(res, null, 'Đã cập nhật role');
});

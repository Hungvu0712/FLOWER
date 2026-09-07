import { asyncHandler } from '../../../core/middleware';
import { ok } from '../../../core/response/ApiResponse';
import * as usersService from './users.service';

export const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getMe(req.user!.id);
  ok(res, user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user!.id, req.body);
  ok(res, user);
});

export const changePassword = asyncHandler(async (req, res) => {
  await usersService.changePassword(req.user!.id, req.body);
  ok(res, null, 'Đổi mật khẩu thành công');
});

export const listSessions = asyncHandler(async (req, res) => {
  const sessions = await usersService.listSessions(req.user!.id, req.cookies?.refresh_token);
  ok(res, sessions);
});

export const revokeSession = asyncHandler(async (req, res) => {
  await usersService.revokeSession(req.user!.id, req.params.id as string);
  ok(res, null, 'Đã đăng xuất thiết bị');
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  await usersService.revokeOtherSessions(req.user!.id, req.cookies?.refresh_token);
  ok(res, null, 'Đã đăng xuất tất cả thiết bị khác');
});

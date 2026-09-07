import { Router } from 'express';
import { authorize, validate } from '../../../core/middleware';
import * as controller from './users.admin.controller';
import { userIdParamSchema, updateRoleSchema, listUsersQuerySchema } from './users.admin.validation';

export const usersAdminRouter = Router();

// Mount với `authenticate` ở app.ts (prefix /api/v1/superadmin/users) — mọi route yêu cầu permission
// `users.manage`, mặc định chỉ role super_admin có (xem DATABASE.md §2.4).
usersAdminRouter.use(authorize('users.manage'));

usersAdminRouter.get('/', validate({ query: listUsersQuerySchema }), controller.list);
usersAdminRouter.patch('/:id/block', validate({ params: userIdParamSchema }), controller.block);
usersAdminRouter.patch('/:id/unblock', validate({ params: userIdParamSchema }), controller.unblock);
usersAdminRouter.delete('/:id', validate({ params: userIdParamSchema }), controller.remove);
usersAdminRouter.post('/:id/reset-password', validate({ params: userIdParamSchema }), controller.resetPassword);
usersAdminRouter.patch('/:id/role', validate({ params: userIdParamSchema, body: updateRoleSchema }), controller.updateRole);

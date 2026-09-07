import { Router } from 'express';
import { authenticate } from '../../core/middleware';
import { authRouter } from '../../modules/core/auth/auth.routes';
import { usersRouter } from '../../modules/core/users/users.routes';
import { usersAdminRouter } from '../../modules/core/users/users.admin.routes';
import { rolesRouter } from '../../modules/core/roles/roles.routes';
import { permissionsRouter } from '../../modules/core/permissions/permissions.routes';
import { loginMethodsRouter } from '../../modules/core/settings/loginMethods.routes';
import { filesRouter } from '../../modules/core/files/files.routes';
import { auditLogRouter } from '../../modules/core/audit-log/auditLog.routes';

export const v1Router = Router();

// Gom router theo mức độ truy cập tăng dần, không route nào "quên" authenticate — xem ARCHITECTURE.md §14.2.
v1Router.use('/auth', authRouter); // công khai (bản thân route tự kiểm tra token khi cần)
v1Router.use('/account', authenticate, usersRouter); // cần đăng nhập (bất kỳ role nào)
v1Router.use('/files', authenticate, filesRouter); // cần đăng nhập; ghi/xoá cần thêm files.manage

v1Router.use('/superadmin/users', authenticate, usersAdminRouter);
v1Router.use('/superadmin/roles', authenticate, rolesRouter);
v1Router.use('/superadmin/permissions', authenticate, permissionsRouter);
v1Router.use('/superadmin/login-methods', authenticate, loginMethodsRouter);
v1Router.use('/superadmin/audit-logs', authenticate, auditLogRouter);

// Domain routes (viết mới cho từng dự án) — mount tại đây, xem ARCHITECTURE.md §2.
// v1Router.use('/products', require('../../modules/domain/products/products.routes').productsRouter);

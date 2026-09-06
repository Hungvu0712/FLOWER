const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');
const authenticate = require('./middlewares/authenticate');
const AppError = require('./lib/AppError');

const authRoutes = require('./modules/core/auth/auth.routes');
const usersRoutes = require('./modules/core/users/users.routes');
const usersAdminRoutes = require('./modules/core/users/users.admin.routes');
const rolesRoutes = require('./modules/core/roles/roles.routes');
const permissionsRoutes = require('./modules/core/permissions/permissions.routes');
const loginMethodsRoutes = require('./modules/core/settings/loginMethods.routes');
const filesRoutes = require('./modules/core/files/files.routes');
const auditLogRoutes = require('./modules/core/audit-log/auditLog.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(env.cookieSecret));

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

// --- core: public / theo mức truy cập tăng dần, không route nào "quên" auth ---
// Xem ARCHITECTURE.md §8.2.
app.use('/api/auth', authRoutes); // công khai (bản thân các route tự kiểm tra token khi cần)
app.use('/api/account', authenticate, usersRoutes); // cần đăng nhập (bất kỳ role nào)
app.use('/api/files', authenticate, filesRoutes); // cần đăng nhập; ghi/xoá cần thêm files.manage

// --- superadmin: cần đăng nhập + permission cụ thể cho từng nhóm (áp trong mỗi router con) ---
app.use('/api/superadmin/users', authenticate, usersAdminRoutes);
app.use('/api/superadmin/roles', authenticate, rolesRoutes);
app.use('/api/superadmin/permissions', authenticate, permissionsRoutes);
app.use('/api/superadmin/login-methods', authenticate, loginMethodsRoutes);
app.use('/api/superadmin/audit-logs', authenticate, auditLogRoutes);

// --- domain routes (viết mới cho từng dự án) — mount tại đây, xem ARCHITECTURE.md §2 ---
// app.use('/api/products', require('./modules/domain/products/products.routes'));

app.use((req, res, next) => next(new AppError('Không tìm thấy endpoint', 404, 'NOT_FOUND')));

app.use(errorHandler); // luôn đăng ký cuối cùng

module.exports = app;

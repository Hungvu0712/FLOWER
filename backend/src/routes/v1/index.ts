import { Router } from "express";
import { authenticate } from "../../shared/middleware";
import { authRouter } from "../../modules/core/auth/auth.routes";
import { usersRouter } from "../../modules/core/users/users.routes";
import { usersAdminRouter } from "../../modules/core/users/users.admin.routes";
import { rolesRouter } from "../../modules/core/roles/roles.routes";
import { permissionsRouter } from "../../modules/core/permissions/permissions.routes";
import { loginMethodsRouter } from "../../modules/core/settings/loginMethods.routes";
import { filesRouter } from "../../modules/core/files/files.routes";
import { auditLogRouter } from "../../modules/core/audit-log/auditLog.routes";
import { contactRouter } from "../../modules/core/contact/contact.routes";
import { contactAdminRouter } from "../../modules/core/contact/contact.admin.routes";
import { categoriesRouter } from "../../modules/domain/categories/categories.routes";
import { categoriesAdminRouter } from "../../modules/domain/categories/categories.admin.routes";
import { productsRouter } from "../../modules/domain/products/products.routes";
import { productsAdminRouter } from "../../modules/domain/products/products.admin.routes";

export const v1Router = Router();

// Gom router theo mức độ truy cập tăng dần, không route nào "quên" authenticate — xem docs/03 §6.
v1Router.use("/auth", authRouter); // công khai (bản thân route tự kiểm tra token khi cần)
v1Router.use("/account", authenticate, usersRouter); // cần đăng nhập (bất kỳ role nào)
v1Router.use("/files", authenticate, filesRouter); // cần đăng nhập; ghi/xoá cần thêm files.manage
v1Router.use("/contact", contactRouter); // công khai — form Liên hệ, có rate limit riêng

// /superadmin/* — chỉ super_admin (quản trị hệ thống: user, role, permission, cấu hình đăng nhập).
v1Router.use("/superadmin/users", authenticate, usersAdminRouter);
v1Router.use("/superadmin/roles", authenticate, rolesRouter);
v1Router.use("/superadmin/permissions", authenticate, permissionsRouter);
v1Router.use("/superadmin/login-methods", authenticate, loginMethodsRouter);
v1Router.use("/superadmin/audit-logs", authenticate, auditLogRouter);

// /admin/* — nghiệp vụ domain, admin/super_admin đều dùng được tuỳ permission (khác /superadmin ở trên
// là dành riêng cho quản trị hệ thống). Xem docs/02 §2, docs/03 §6.
v1Router.use("/categories", categoriesRouter); // công khai — storefront đọc danh mục
v1Router.use("/admin/categories", authenticate, categoriesAdminRouter);
v1Router.use("/products", productsRouter); // công khai — storefront đọc sản phẩm
v1Router.use("/admin/products", authenticate, productsAdminRouter);
// contact-messages nằm ở modules/core (tính năng chung mọi dự án), nhưng mount dưới /admin/* như
// domain — quy ước /admin/* vs /superadmin/* phân theo MỨC TRUY CẬP (admin hay chỉ super_admin),
// không phải theo code nằm ở core hay domain, xem docs/02 §14.1.
v1Router.use("/admin/contact-messages", authenticate, contactAdminRouter);

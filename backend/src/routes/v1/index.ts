import { Router } from "express";
import { authenticate } from "../../shared/middleware";
import { authRouter } from "../../modules/core/auth/auth.routes";
import { usersRouter } from "../../modules/core/users/users.routes";
import { usersAdminRouter } from "../../modules/core/users/users.admin.routes";
import { rolesRouter } from "../../modules/core/roles/roles.routes";
import { permissionsRouter } from "../../modules/core/permissions/permissions.routes";
import { loginMethodsRouter } from "../../modules/core/settings/loginMethods.routes";
import { systemSettingsRouter } from "../../modules/core/settings/systemSettings.routes";
import { filesRouter } from "../../modules/core/files/files.routes";
import { foldersRouter } from "../../modules/core/files/folders.routes";
import { auditLogRouter } from "../../modules/core/audit-log/auditLog.routes";
import { contactRouter } from "../../modules/core/contact/contact.routes";
import { contactAdminRouter } from "../../modules/core/contact/contact.admin.routes";
import { categoriesRouter } from "../../modules/domain/categories/categories.routes";
import { categoriesAdminRouter } from "../../modules/domain/categories/categories.admin.routes";
import { occasionsRouter } from "../../modules/domain/occasions/occasions.routes";
import { occasionsAdminRouter } from "../../modules/domain/occasions/occasions.admin.routes";
import { productsRouter } from "../../modules/domain/products/products.routes";
import { productsAdminRouter } from "../../modules/domain/products/products.admin.routes";
import { ordersRouter, accountOrdersRouter } from "../../modules/domain/orders/orders.routes";
import { ordersAdminRouter } from "../../modules/domain/orders/orders.admin.routes";
import { addressesRouter } from "../../modules/domain/addresses/addresses.routes";
import { wishlistRouter } from "../../modules/domain/wishlist/wishlist.routes";
import { reviewsRouter } from "../../modules/domain/reviews/reviews.routes";
import { accountReviewsRouter } from "../../modules/domain/reviews/reviews.account.routes";
import { reviewsAdminRouter } from "../../modules/domain/reviews/reviews.admin.routes";
import { couponsRouter } from "../../modules/domain/coupons/coupons.routes";
import { couponsAdminRouter } from "../../modules/domain/coupons/coupons.admin.routes";
import { blogRouter } from "../../modules/domain/blog/blog.routes";
import { blogAdminRouter } from "../../modules/domain/blog/blog.admin.routes";
import { newsletterRouter } from "../../modules/domain/newsletter/newsletter.routes";
import { newsletterAdminRouter } from "../../modules/domain/newsletter/newsletter.admin.routes";
import { specialDatesRouter } from "../../modules/domain/specialDates/specialDates.routes";
import { siteContentRouter } from "../../modules/domain/siteContent/siteContent.routes";
import { siteContentAdminRouter } from "../../modules/domain/siteContent/siteContent.admin.routes";

export const v1Router = Router();

// Gom router theo mức độ truy cập tăng dần, không route nào "quên" authenticate — xem docs/03 §6.
v1Router.use("/auth", authRouter); // công khai (bản thân route tự kiểm tra token khi cần)
v1Router.use("/account", authenticate, usersRouter); // cần đăng nhập (bất kỳ role nào)
// docs/12 §5.1 — lịch sử đơn của chính khách, cần thêm orders.view_own (khác /account ở trên, chỉ
// cần đăng nhập) vì đây là permission có thể thu hồi riêng, không gắn liền với việc "là chính mình".
v1Router.use("/account/orders", authenticate, accountOrdersRouter);
// Sổ địa chỉ — thuần dữ liệu cá nhân, chỉ cần authenticate (giống /account ở trên), KHÔNG có
// permission riêng như /account/orders — xem docs/modules/domain-addresses.md.
v1Router.use("/account/addresses", authenticate, addressesRouter);
// Danh sách yêu thích — cùng mẫu addresses (dữ liệu cá nhân, không permission riêng).
v1Router.use("/account/wishlist", authenticate, wishlistRouter);
// Viết đánh giá — chỉ cần authenticate (không permission riêng); duyệt/xoá đánh giá của người khác
// cần `reviews.moderate`, xem /admin/reviews bên dưới.
v1Router.use("/account/reviews", authenticate, accountReviewsRouter);
// Nhắc lịch sinh nhật/kỷ niệm — cùng mẫu addresses/wishlist (dữ liệu cá nhân, không permission riêng).
v1Router.use("/account/special-dates", authenticate, specialDatesRouter);
v1Router.use("/files", authenticate, filesRouter); // cần đăng nhập; ghi/xoá cần thêm files.manage
v1Router.use("/folders", authenticate, foldersRouter); // cần files.manage cho MỌI route (BE-19)
v1Router.use("/contact", contactRouter); // công khai — form Liên hệ, có rate limit riêng

// /superadmin/* — chỉ super_admin (quản trị hệ thống: user, role, permission, cấu hình đăng nhập).
v1Router.use("/superadmin/users", authenticate, usersAdminRouter);
v1Router.use("/superadmin/roles", authenticate, rolesRouter);
v1Router.use("/superadmin/permissions", authenticate, permissionsRouter);
v1Router.use("/superadmin/login-methods", authenticate, loginMethodsRouter);
v1Router.use("/superadmin/settings", authenticate, systemSettingsRouter);
v1Router.use("/superadmin/audit-logs", authenticate, auditLogRouter);

// /admin/* — nghiệp vụ domain, admin/super_admin đều dùng được tuỳ permission (khác /superadmin ở trên
// là dành riêng cho quản trị hệ thống). Xem docs/02 §2, docs/03 §6.
v1Router.use("/categories", categoriesRouter); // công khai — storefront đọc danh mục
v1Router.use("/admin/categories", authenticate, categoriesAdminRouter);
v1Router.use("/occasions", occasionsRouter); // công khai — storefront đọc dịp lễ
v1Router.use("/admin/occasions", authenticate, occasionsAdminRouter);
v1Router.use("/products", productsRouter); // công khai — storefront đọc sản phẩm
v1Router.use("/admin/products", authenticate, productsAdminRouter);
// /orders: công khai (guest checkout) — bản thân router tự gắn `attachUserIfPresent` cho POST, không
// dùng `authenticate` ở đây vì sẽ bắt buộc đăng nhập (chặn khách vãng lai đặt hàng).
v1Router.use("/orders", ordersRouter);
v1Router.use("/admin/orders", authenticate, ordersAdminRouter);
v1Router.use("/reviews", reviewsRouter); // công khai — storefront đọc đánh giá đã duyệt
v1Router.use("/admin/reviews", authenticate, reviewsAdminRouter);
// /coupons: công khai — khách xem trước số tiền được giảm ở /thanh-toan (kể cả guest checkout).
v1Router.use("/coupons", couponsRouter);
v1Router.use("/admin/coupons", authenticate, couponsAdminRouter);
v1Router.use("/blog", blogRouter); // công khai — storefront đọc bài viết đã xuất bản
v1Router.use("/admin/blog", authenticate, blogAdminRouter);
v1Router.use("/newsletter", newsletterRouter); // công khai — đăng ký/hủy nhận tin, có rate limit riêng
v1Router.use("/admin/newsletter", authenticate, newsletterAdminRouter);
// site-content: banner Hero/hotline/Zalo/địa chỉ/giờ mở cửa — permission RIÊNG (site_content.manage,
// cấp cho cả admin) khác settings.manage (/superadmin/settings, chỉ super_admin) vì đây là nội dung
// cửa hàng, không phải cấu hình hệ thống — xem docs/modules/domain-site-content.md.
v1Router.use("/site-content", siteContentRouter); // công khai — storefront đọc
v1Router.use("/admin/site-content", authenticate, siteContentAdminRouter);
// contact-messages nằm ở modules/core (tính năng chung mọi dự án), nhưng mount dưới /admin/* như
// domain — quy ước /admin/* vs /superadmin/* phân theo MỨC TRUY CẬP (admin hay chỉ super_admin),
// không phải theo code nằm ở core hay domain, xem docs/02 §14.1.
v1Router.use("/admin/contact-messages", authenticate, contactAdminRouter);

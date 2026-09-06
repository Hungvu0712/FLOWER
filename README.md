# 🌸 FLOWER SHOP — Website bán hoa trực tuyến

Kế hoạch chi tiết cho website thương mại điện tử bán hoa, hướng đến người dùng thật (đặt hoa sinh nhật, cưới hỏi, khai trương, chia buồn, quà tặng...).

- **Frontend:** Next.js (React, App Router, TypeScript)
- **Backend:** Node.js + Express (modular + MVC)
- **Database:** PostgreSQL (Neon lúc dev, tự quản lý qua Docker trên VPS khi scale) + Prisma ORM
- **File/ảnh:** Cloudflare R2
- **Email:** Resend

> Xem chuẩn kiến trúc backend/frontend & quy ước package tại **[ARCHITECTURE.md](ARCHITECTURE.md)**, schema & RBAC tại **[DATABASE.md](DATABASE.md)**, bảo mật tại **[SECURITY.md](SECURITY.md)**.

---

## 1. Mục tiêu sản phẩm

Xây dựng một cửa hàng hoa online cho phép khách:
- Xem, tìm kiếm và đặt mua hoa theo danh mục/dịp lễ.
- Đặt hoa giao theo **ngày giờ cụ thể** (điểm khác biệt quan trọng so với thương mại điện tử thông thường — hoa phải tươi và đúng giờ).
- Thanh toán online, theo dõi đơn hàng theo thời gian thực.
- Cho phép chủ shop (admin) quản lý sản phẩm, đơn hàng, khuyến mãi, khách hàng.

---

## 2. Danh sách chức năng

### 2.1. Phía khách hàng (Storefront)

**Khám phá & tìm sản phẩm**
- Trang chủ: banner khuyến mãi, sản phẩm nổi bật, hoa theo dịp (sinh nhật, tình yêu, khai trương, chia buồn, cưới hỏi...).
- Danh mục sản phẩm: hoa bó, hoa giỏ, hoa lẵng, hoa cưới, cây cảnh, hoa khô/lụa...
- Tìm kiếm theo tên, lọc theo giá / màu sắc / dịp / loại hoa.
- Trang chi tiết sản phẩm: ảnh (nhiều góc/zoom), mô tả, giá theo size, đánh giá & rating, sản phẩm liên quan.

**Đặt hàng**
- Giỏ hàng (thêm/sửa/xoá, lưu tạm khi chưa đăng nhập – guest cart).
- Đặt hoa theo yêu cầu riêng: chọn loại hoa, tông màu, ngân sách, ghi chú cho florist thiết kế.
- Chọn **ngày giờ giao hoa** cụ thể + khung giờ giao (sáng/chiều/giờ hẹn) — bắt buộc với ngành hoa.
- Thêm thiệp chúc & lời nhắn kèm đơn hàng.
- Sổ địa chỉ người nhận (khác người đặt — đặc thù ngành hoa: đặt hộ người khác).
- Thanh toán: COD, chuyển khoản, cổng thanh toán (VNPay/Momo/ZaloPay/Stripe).
- Áp mã giảm giá / voucher.
- Theo dõi trạng thái đơn hàng (Đã đặt → Đang chuẩn bị → Đang giao → Đã giao), thông báo qua email/SMS.

**Tài khoản**
- Đăng ký/đăng nhập với **3 phương thức**: email + mật khẩu, Google OAuth, **magic link** (gửi qua email, dùng 1 lần) — chi tiết ở mục 2.3 và [DATABASE.md §3.2](DATABASE.md).
- Quản lý phiên đăng nhập qua **JWT + Cookie** (httpOnly).
- Tự quản lý tài khoản: xem/sửa hồ sơ (họ tên, avatar), đổi mật khẩu, quên mật khẩu, **quản lý thiết bị đã đăng nhập** và **đăng xuất từ xa** (thu hồi phiên trên thiết bị khác).
- Lịch sử đơn hàng, đặt lại đơn cũ (reorder).
- Danh sách yêu thích (wishlist).
- **Nhắc lịch đặc biệt**: lưu ngày sinh nhật/kỷ niệm người thân, hệ thống tự gửi email nhắc trước vài ngày để đặt hoa.
- Đánh giá & bình luận sản phẩm sau khi nhận hàng.

**Nội dung & hỗ trợ**
- Blog: ý nghĩa các loại hoa, mẹo bảo quản, cắm hoa.
- Đăng ký nhận bản tin (newsletter) qua email.
- Chat hỗ trợ / form liên hệ / FAQ.
- Trang chính sách: đổi trả, giao hàng, bảo mật.

### 2.2. Phía quản trị (Admin Dashboard)

- Quản lý sản phẩm: CRUD, upload nhiều ảnh, biến thể (size/giá), tồn kho.
- Quản lý danh mục & dịp lễ (tag sản phẩm theo dịp).
- Quản lý đơn hàng: xem chi tiết, cập nhật trạng thái, in phiếu giao hàng, phân công người giao.
- Quản lý giao hàng: khu vực giao, phí ship theo khu vực, khung giờ giao.
- Quản lý khuyến mãi: mã giảm giá, chương trình sale theo ngày lễ (Valentine, 8/3, 20/10...).
- Quản lý đánh giá: duyệt/ẩn review.
- Quản lý banner trang chủ & nội dung blog.
- Thống kê & báo cáo: doanh thu theo ngày/tháng, sản phẩm bán chạy, biểu đồ dịp lễ cao điểm.
- **Quản lý tài nguyên (file/ảnh)**: xem theo cây thư mục, chuyển đổi dạng lưới (grid)/danh sách (list), tái sử dụng ảnh đã upload, xoá thủ công tài nguyên không dùng.
- Quản lý vai trò & phân quyền nhân viên (`admin`, `sales_staff`, `florist`, `shipper`) — chi tiết tại [DATABASE.md §2](DATABASE.md#2-hệ-thống-vai-trò--phân-quyền-rbac).

### 2.3. Khu vực SuperAdmin (riêng biệt, tách khỏi Admin)

- **Quản lý người dùng** (đặc quyền tuyệt đối, chỉ `super_admin` truy cập được):
  - Xem danh sách toàn bộ user, lọc theo role/trạng thái.
  - Block/unblock tài khoản.
  - Reset mật khẩu cho user → hệ thống tự sinh mật khẩu mới và **gửi qua email** (Resend).
  - Cập nhật role của user — **không được** tự đổi role chính mình, **không được** nâng bất kỳ ai (kể cả bản thân) lên `super_admin` qua UI.
- **Cấu hình phương thức đăng nhập**: bật/tắt từng phương thức (Google OAuth / email-password / magic link); hệ thống **cảnh báo và chặn** nếu thao tác khiến không còn phương thức nào được bật.
- Cấu hình hệ thống, API key thanh toán/email.

### 2.4. Chức năng nền tảng (kỹ thuật)

- **Xác thực**: 3 phương thức (email/password, Google OAuth, magic link qua email dùng 1 lần), quản lý phiên qua JWT + Cookie httpOnly, refresh token rotation, quản lý thiết bị/đăng xuất từ xa — chi tiết schema tại [DATABASE.md §3.2](DATABASE.md).
- Upload ảnh & lưu trữ file: **Cloudflare R2**, có cơ chế đánh dấu tái sử dụng ảnh cũ và dọn dẹp tài nguyên mồ côi định kỳ (10 ngày/lần).
- Email service: **Resend** — gửi xác nhận đơn hàng, magic link, reset password, nhắc lịch, khuyến mãi.
- Thông báo real-time trạng thái đơn hàng: Socket.io.
- Thanh toán: tích hợp cổng thanh toán VN (VNPay/Momo) và/hoặc Stripe.
- Cache/session: Redis (giỏ hàng, rate limiting).
- Tìm kiếm: PostgreSQL full-text search (giai đoạn đầu), có thể nâng cấp Elasticsearch sau.
- Bảo mật: xem chi tiết đầy đủ tại **[SECURITY.md](SECURITY.md)** (auth, chống IDOR, thanh toán, dữ liệu cá nhân, hạ tầng...).

---

## 3. Kiến trúc hệ thống

```
[ Next.js App ]  <---REST/JSON--->  [ Express API ]  <--->  [ PostgreSQL (Neon/VPS) ]
     |                                     |                          |
  (App Router,                        (Modular+MVC,              (Prisma ORM)
   Server Components                   Redis cache,
   cho trang SEO,                      JWT + Cookie auth,
   React Query,                        Socket.io)
   Zustand)                                 |
                                    [ Cloudflare R2 ] (file/ảnh)
                                    [ Resend ] (email)
```

- **Kiến trúc:** Next.js đóng vai trò frontend (SSR/SSG cho trang cần SEO như trang chủ, danh mục, chi tiết sản phẩm; Client Components cho phần tương tác như giỏ hàng, checkout), gọi REST API riêng từ Express (modular + MVC, xem [ARCHITECTURE.md](ARCHITECTURE.md)). Có thể tách thêm service thanh toán/webhook riêng nếu mở rộng.
- **Realtime:** Socket.io cho cập nhật trạng thái đơn hàng / thông báo admin có đơn mới.
- **File ảnh:** lưu ở Cloudflare R2 (presigned upload), DB chỉ lưu key/URL; tận dụng `next/image` để tối ưu ảnh hoa tự động.

---

## 4. Cấu trúc thư mục dự kiến

```
FLOWER/
├── frontend/                # Next.js app (App Router, TypeScript)
│   ├── src/
│   │   ├── app/             # routes: page.tsx, layout.tsx theo file-system routing
│   │   │   ├── (storefront)/    # PUBLIC: /, /products/[slug], /cart, /checkout...
│   │   │   ├── (account)/       # PROTECTED: /profile, /orders, /devices (cần đăng nhập)
│   │   │   ├── admin/           # PRIVATE (role admin+): /admin/products, /admin/orders...
│   │   │   └── superadmin/      # PRIVATE (chỉ super_admin): /superadmin/users, /superadmin/auth-settings
│   │   ├── components/      # UI dùng chung (Button, Card, Modal...)
│   │   ├── features/        # theo domain: auth, cart, orders, products
│   │   ├── hooks/           # custom hook gọi API (useProducts, useCreateOrder...)
│   │   ├── services/        # gọi API (axios instances tới backend Express)
│   │   ├── store/           # Zustand — global client state
│   │   └── middleware.ts    # bảo vệ route /admin, /superadmin, /account ở edge
│   └── package.json
│
├── backend/                 # Node.js + Express API (modular + MVC, xem ARCHITECTURE.md)
│   ├── src/
│   │   ├── config/          # env, prisma client, r2 client, resend client
│   │   ├── modules/
│   │   │   ├── auth/         # login (3 phương thức), refresh, logout, magic-link, sessions
│   │   │   ├── users/        # profile, đổi mật khẩu; users.manage (superadmin) riêng
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── reviews/
│   │   │   ├── promotions/
│   │   │   └── files/         # upload R2, quản lý folder, dọn file mồ côi
│   │   ├── middlewares/     # authenticate, authorize, errorHandler, asyncHandler, validate
│   │   ├── lib/              # AppError, logger
│   │   ├── jobs/             # cron: backup DB, xoá file mồ côi, xoá backup cũ
│   │   └── app.js
│   ├── prisma/               # schema.prisma, migrations/, seed.ts
│   └── package.json
│
├── docs/                    # tài liệu API, sơ đồ DB
└── README.md
```

---

## 5. Thiết kế Database & Phân quyền (PostgreSQL)

Toàn bộ schema chi tiết (bảng, quan hệ, index) và hệ thống **role/permission (RBAC)** cho các vai trò nội bộ (`super_admin`, `admin`, `sales_staff`, `florist`, `shipper`, `member`) được tách riêng để dễ tra cứu:

👉 Xem chi tiết tại **[DATABASE.md](DATABASE.md)**

Tóm tắt nhanh:

- 6 vai trò tối thiểu: `super_admin`, `admin`, `sales_staff`, `florist`, `shipper`, `member` (chuẩn chung của dự án luôn có tối thiểu `super_admin`/`admin`/`member`, các vai trò còn lại là mở rộng theo nghiệp vụ shop hoa).
- Phân quyền theo permission code (`orders.update_status`, `products.delete`...) qua bảng `roles` / `permissions` / `role_permissions`, không hard-code trong logic nghiệp vụ.
- Riêng quản lý **user** (block/unblock, reset password, đổi role) chỉ `super_admin` được phép, có ràng buộc chống tự nâng quyền — xem [DATABASE.md §2.1](DATABASE.md#21-vì-sao-cần-rbac-chi-tiết-cho-shop-hoa).
- Có nhóm bảng riêng cho **xác thực đa phương thức** (OAuth, magic link, password reset, quản lý phiên/thiết bị) và **quản lý file/ảnh trên R2** (tái sử dụng + dọn dẹp mồ côi).
- ~28 bảng chính chia 6 nhóm: Người dùng & phân quyền, Xác thực & phiên đăng nhập, Quản lý file & tài nguyên, Sản phẩm, Giỏ hàng & Đơn hàng, Nội dung & Thông báo.

---

## 6. Thiết kế API (REST) — nhóm chính

```
Auth
POST   /api/auth/register                     (email + password)
POST   /api/auth/login                        (email + password)
POST   /api/auth/magic-link/request           (gửi magic link qua Resend)
POST   /api/auth/magic-link/verify            (đăng nhập bằng token magic link, dùng 1 lần)
GET    /api/auth/google                       (redirect OAuth)
GET    /api/auth/google/callback
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/login-methods                (public — FE dùng để ẩn/hiện nút đăng nhập tương ứng)

Account (yêu cầu đăng nhập — chức năng tự quản lý)
GET    /api/account/me
PATCH  /api/account/profile                   (full_name, avatar)
POST   /api/account/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/account/sessions                  (danh sách thiết bị đang đăng nhập)
DELETE /api/account/sessions/:id              (đăng xuất 1 thiết bị từ xa)
DELETE /api/account/sessions                  (đăng xuất tất cả thiết bị khác)

SuperAdmin — quản lý user (chỉ super_admin)
GET    /api/superadmin/users
PATCH  /api/superadmin/users/:id/block
PATCH  /api/superadmin/users/:id/unblock
POST   /api/superadmin/users/:id/reset-password   (sinh mật khẩu mới, gửi email)
PATCH  /api/superadmin/users/:id/role
GET    /api/superadmin/login-methods
PATCH  /api/superadmin/login-methods/:method      (bật/tắt, chặn nếu tắt hết)

Files & tài nguyên
POST   /api/files/presign                     (lấy presigned URL upload lên R2)
POST   /api/files                             (lưu metadata sau khi upload xong)
GET    /api/files                             ?folderId=&view=grid|list
DELETE /api/files/:id

Products
GET    /api/products              ?category=&occasion=&search=&minPrice=&maxPrice=&page=
GET    /api/products/:slug
POST   /api/products               (admin)
PUT    /api/products/:id           (admin)
DELETE /api/products/:id           (admin)

Cart
GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id

Orders
POST   /api/orders                 (tạo đơn từ giỏ hàng, kèm delivery info)
GET    /api/orders                 (đơn của user)
GET    /api/orders/:code
PATCH  /api/orders/:id/status      (admin/staff)

Payments
POST   /api/payments/create-intent
POST   /api/payments/webhook       (callback từ cổng thanh toán)

Reviews
POST   /api/products/:id/reviews
GET    /api/products/:id/reviews

Promotions
POST   /api/coupons/apply

Admin
GET    /api/admin/dashboard/stats
GET    /api/admin/orders
GET    /api/admin/customers
```

Tất cả response theo chuẩn:
```json
{ "success": true, "data": {...}, "message": "..." }
```

---

## 7. Lộ trình phát triển (Roadmap)

### Giai đoạn 1 — MVP (4–5 tuần)
- Setup dự án (Next.js + TS, Express modular/MVC, Neon PostgreSQL + Prisma) theo [ARCHITECTURE.md](ARCHITECTURE.md).
- Auth đầy đủ: email/password, Google OAuth, magic link + JWT/Cookie session, seed 6 role.
- Tự quản lý tài khoản cơ bản: profile, đổi mật khẩu, quên mật khẩu.
- Upload file/ảnh qua Cloudflare R2 (presigned URL).
- CRUD sản phẩm, danh mục (admin cơ bản).
- Trang chủ, danh sách sản phẩm, chi tiết sản phẩm.
- Giỏ hàng, đặt hàng (COD), chọn ngày/giờ giao hoa.
- Trang quản lý đơn hàng cho admin.

### Giai đoạn 2 — Thanh toán & trải nghiệm (3–4 tuần)
- Tích hợp cổng thanh toán online (VNPay/Momo).
- Theo dõi trạng thái đơn hàng + email thông báo (Resend).
- Quản lý thiết bị & đăng xuất từ xa.
- Khu vực SuperAdmin: quản lý user (block/unblock, reset password, đổi role), bật/tắt phương thức đăng nhập.
- Đánh giá sản phẩm, wishlist.
- Sổ địa chỉ người nhận, thiệp chúc kèm đơn.

### Giai đoạn 3 — Tăng trưởng & giữ chân khách (3 tuần)
- Mã giảm giá / chương trình khuyến mãi theo dịp lễ.
- Đặt hoa theo yêu cầu riêng (custom bouquet).
- Nhắc lịch đặc biệt (sinh nhật/kỷ niệm) qua email.
- Màn hình quản lý tài nguyên (file/ảnh theo folder, grid/list) + cron dọn file mồ côi.
- Blog, newsletter.

### Giai đoạn 4 — Mở rộng
- Dashboard thống kê nâng cao cho admin.
- Chat hỗ trợ / chatbot tư vấn chọn hoa.
- Responsive/PWA để dùng tốt trên mobile, tối ưu SEO.
- Đa chi nhánh / đa khu vực giao hàng (nếu mở rộng kinh doanh).
- Khi scale lớn: chuyển DB từ Neon sang VPS tự quản lý qua Docker, bật cron backup 2 ngày/lần lên R2 (tự xoá sau 1 tháng); cân nhắc tách `apps/client` và `apps/admin` thành 2 frontend riêng (xem [ARCHITECTURE.md §5.1](ARCHITECTURE.md)).

---

## 8. Công nghệ đề xuất chi tiết

| Hạng mục | Công nghệ |
|---|---|
| Frontend | Next.js (App Router, React 19, TypeScript) cho app cần SEO; React (Vite) + TS cho app nội bộ nếu tách riêng. Validate: `zod` + `react-hook-form`. Data fetching: `@tanstack/react-query` + `axios`. Global state: `zustand`. Style: TailwindCSS |
| Backend | Node.js, Express (modular + MVC, xem [ARCHITECTURE.md](ARCHITECTURE.md)), Prisma ORM, `zod` validate input |
| Database | PostgreSQL — **Neon** (dev), tự quản lý qua Docker trên VPS (production khi scale) |
| Cache/Session | Redis |
| Auth | JWT + Cookie (httpOnly), bcrypt, Google OAuth, Magic link (Resend), bật/tắt phương thức qua SuperAdmin |
| Lưu trữ file/ảnh | **Cloudflare R2** (S3-compatible, free tier), presigned upload, dedup + dọn file mồ côi định kỳ |
| Thanh toán | VNPay/Momo (nội địa), Stripe (nếu cần quốc tế) |
| Email | **Resend** |
| Realtime | Socket.io |
| Deploy | Docker + Docker Compose (khi lên VPS); FE (Next.js) trên Vercel, BE trên Render/Railway/VPS |
| Backup | `pg_dump` định kỳ 2 ngày/lần → Cloudflare R2, tự xoá bản backup cũ hơn 1 tháng |
| CI/CD | GitHub Actions |

---

## 9. Bước tiếp theo

1. Xác nhận phạm vi MVP (những chức năng nào bắt buộc có ngay từ đầu).
2. Khởi tạo 2 project con: `frontend/` (Next.js — đã scaffold xong) và `backend/` (Express, theo cấu trúc modular ở [ARCHITECTURE.md](ARCHITECTURE.md)).
3. Thiết kế schema Prisma dựa trên [DATABASE.md](DATABASE.md) (roles, auth, files...) và chạy migration đầu tiên trên Neon.
4. Dựng khung API cho `auth` (3 phương thức) và `products` trước để có dữ liệu hiển thị lên FE.
5. Seed 6 role + tài khoản `super_admin` mặc định, seed `login_method_settings`.

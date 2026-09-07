# 🌸 FLOWER SHOP — Website bán hoa trực tuyến

Kế hoạch chi tiết cho website thương mại điện tử bán hoa, hướng đến người dùng thật (đặt hoa sinh nhật, cưới hỏi, khai trương, chia buồn, quà tặng...).

- **Frontend:** Next.js (React, App Router, TypeScript)
- **Backend:** Node.js + Express + **TypeScript (strict mode)** (modular + MVC + Service Layer)
- **Database:** PostgreSQL (Neon lúc dev, tự quản lý qua Docker trên VPS khi scale) + Prisma ORM
- **File/ảnh:** Cloudflare R2
- **Email:** Resend (cần domain riêng đã xác minh) — fallback Nodemailer + SMTP nếu chưa có domain, xem [ARCHITECTURE.md §9](ARCHITECTURE.md#9-email)

> Xem chuẩn kiến trúc backend/frontend & quy ước package tại **[ARCHITECTURE.md](ARCHITECTURE.md)**, schema & RBAC tại **[DATABASE.md](DATABASE.md)**, bảo mật tại **[SECURITY.md](SECURITY.md)**.

> 🔧🌸 Repo này được tổ chức thành 2 lớp: **core** (auth, RBAC, quản lý file, email, routing nền tảng — dùng lại được cho các dự án PERN khác) và **domain** (nghiệp vụ shop hoa). Xem chiến lược tái sử dụng ở [ARCHITECTURE.md §2](ARCHITECTURE.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

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
  - Block/unblock, **xoá (soft delete)** tài khoản.
  - Reset mật khẩu cho user → hệ thống tự sinh mật khẩu mới và **gửi qua email** (Resend).
  - Cập nhật role của user, gán role cho user.
  - **Không được tự đổi role / tự block / tự xoá chính mình**, **không được** gán hoặc tạo thêm `super_admin` qua các chức năng thông thường.
- **Cấu hình phương thức đăng nhập**: bật/tắt từng phương thức (Google OAuth / email-password / magic link); hệ thống **cảnh báo và chặn** nếu thao tác khiến không còn phương thức nào được bật.
- **Quản lý role tuỳ ý**: tạo/sửa/xoá Custom Role ngoài 3 System Role bắt buộc (`super_admin`/`admin`/`member`, không xoá được), tick chọn permission cho từng role qua UI.
- **Quản lý permission tuỳ ý**: tạo/sửa/xoá permission (ngoài catalog permission hệ thống seed sẵn), gán cho role. *Lưu ý*: permission tự tạo chỉ thật sự có tác dụng khi có route được lập trình kiểm tra permission đó — tạo qua UI mà chưa nối vào code thì permission chỉ dùng để tổ chức, chưa chặn được gì.
  - Riêng các permission "restricted" (`users.manage`, `settings.manage`, `roles.manage`, `permissions.manage`) **không hiện trong danh sách tick chọn** khi tạo/sửa role thường — chỉ tồn tại sẵn ở 3 System Role, tránh tạo ra "super_admin trá hình" — xem [DATABASE.md §2.1](DATABASE.md#21-vì-sao-cần-rbac-chi-tiết-cho-shop-hoa).
- Cấu hình hệ thống, API key thanh toán/email.
- **Mọi thao tác trên đều ghi Audit Log** (ai, khi nào, giá trị trước/sau) — có màn hình riêng để `super_admin` tra cứu, lọc theo người thực hiện/đối tượng/thời gian.

### 2.4. Chức năng nền tảng (kỹ thuật)

- **Xác thực**: 3 phương thức (email/password, Google OAuth, magic link qua email dùng 1 lần), quản lý phiên qua JWT + Cookie httpOnly, refresh token rotation, quản lý thiết bị/đăng xuất từ xa — chi tiết schema tại [DATABASE.md §3.2](DATABASE.md).
- Upload ảnh & lưu trữ file: **Cloudflare R2**, có cơ chế đánh dấu tái sử dụng ảnh cũ và dọn dẹp tài nguyên mồ côi định kỳ (10 ngày/lần).
- Email service: **Resend** (production, sau khi đã xác minh domain riêng — không gửi được bằng địa chỉ Gmail cá nhân) hoặc **Nodemailer + SMTP** (tạm thời khi chưa có domain, lưu ý dễ vào spam) — gửi xác nhận đơn hàng, magic link, reset password, nhắc lịch, khuyến mãi. Đổi qua lại giữa 2 phương án chỉ qua biến môi trường, xem [ARCHITECTURE.md §9](ARCHITECTURE.md#9-email).
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

Cấu trúc dưới đây tách rõ **core** (🔧 tái sử dụng nguyên vẹn khi bắt đầu dự án PERN khác) và **domain** (🌸 đặc thù nghiệp vụ shop hoa) — chi tiết chiến lược tại [ARCHITECTURE.md §2](ARCHITECTURE.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

```
FLOWER/
├── frontend/                # Next.js app (App Router, TypeScript) — đã scaffold, xem frontend/README.md
│   ├── src/
│   │   ├── app/             # routes: page.tsx, layout.tsx theo file-system routing
│   │   │   ├── (storefront)/    # 🌸 PUBLIC: /, /products/[slug], /cart, /checkout... (chưa triển khai)
│   │   │   ├── (auth)/          # 🔧 PUBLIC: /login, /register, /magic-link, /forgot-password...
│   │   │   ├── account/         # 🔧 PROTECTED: /account/profile, /account/devices (route thật, không phải route group — để proxy.ts match theo prefix)
│   │   │   ├── admin/           # 🔧 khung + 🌸 nội dung menu: /admin (dashboard placeholder, mở rộng dần)
│   │   │   └── superadmin/      # 🔧 PRIVATE (chỉ super_admin): /superadmin/users, /superadmin/login-methods
│   │   ├── components/ui/   # UI dùng chung (Button, FormField...)
│   │   ├── features/
│   │   │   ├── core/         # 🔧 mỗi feature = *.service.ts (axios) + *.hooks.ts (TanStack Query): auth, account, files, admin-users, admin-login-methods
│   │   │   └── domain/       # 🌸 products, cart, orders, promotions, blog (chưa triển khai)
│   │   ├── lib/              # 🔧 axios instance, decode JWT (chỉ đọc, không verify — xem lib/jwt.ts)
│   │   ├── store/            # 🔧 Zustand — global client state (vd user hiện tại)
│   │   └── proxy.ts          # 🔧 Next.js 16 "proxy" (đổi tên từ middleware.ts) — bảo vệ route /admin, /superadmin, /account
│   └── package.json
│
├── backend/                 # Node.js + Express API (modular + MVC, xem ARCHITECTURE.md)
│   ├── src/
│   │   ├── config/          # 🔧 env, prisma client, r2 client, resend client
│   │   ├── modules/
│   │   │   ├── core/          # 🔧 copy nguyên khi sang dự án mới
│   │   │   │   ├── auth/       # login (3 phương thức), refresh, logout, magic-link, sessions
│   │   │   │   ├── users/      # profile, đổi mật khẩu, quản lý thiết bị (self-service)
│   │   │   │   ├── roles/      # CRUD Custom Role (superadmin)
│   │   │   │   ├── permissions/ # CRUD Permission (superadmin)
│   │   │   │   ├── files/      # upload R2, quản lý folder, dọn file mồ côi
│   │   │   │   ├── email/      # abstraction Resend/SMTP
│   │   │   │   └── audit-log/
│   │   │   └── domain/        # 🌸 viết mới cho từng dự án
│   │   │       ├── products/
│   │   │       ├── categories/
│   │   │       ├── cart/
│   │   │       ├── orders/
│   │   │       ├── payments/
│   │   │       ├── reviews/
│   │   │       └── promotions/
│   │   ├── middlewares/     # 🔧 authenticate, authorize, errorHandler, asyncHandler, validate
│   │   ├── lib/              # 🔧 AppError, logger
│   │   ├── jobs/             # 🔧 cron: backup DB, xoá file mồ côi, xoá backup cũ
│   │   └── app.js
│   ├── prisma/
│   │   ├── schema.prisma     # model core ở đầu file, model domain ở cuối (banner comment phân tách)
│   │   ├── migrations/
│   │   └── seed/
│   │       ├── core.seed.ts   # 🔧 3 System Role, permission core, login_method_settings, super_admin mặc định
│   │       └── domain.seed.ts # 🌸 sales_staff/florist/shipper, permission products.*/orders.*..., danh mục mẫu
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

Mọi route mount dưới **`/api/v1`** (versioning bắt buộc — xem [ARCHITECTURE.md §5](ARCHITECTURE.md#5-api)). `GET /health` là ngoại lệ duy nhất, không versioning.

```
Auth
POST   /api/v1/auth/register                     (email + password)
POST   /api/v1/auth/login                        (email + password)
POST   /api/v1/auth/magic-link/request           (gửi magic link qua Resend)
POST   /api/v1/auth/magic-link/verify            (đăng nhập bằng token magic link, dùng 1 lần)
POST   /api/v1/auth/google                       (verify Google ID token — Google Identity Services)
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/login-methods                (public — FE dùng để ẩn/hiện nút đăng nhập tương ứng)

Account (yêu cầu đăng nhập — chức năng tự quản lý)
GET    /api/v1/account/me
PATCH  /api/v1/account/profile                   (fullName, avatarFileId)
POST   /api/v1/account/change-password
GET    /api/v1/account/sessions                  (danh sách thiết bị đang đăng nhập)
DELETE /api/v1/account/sessions/:id              (đăng xuất 1 thiết bị từ xa)
DELETE /api/v1/account/sessions                  (đăng xuất tất cả thiết bị khác)

SuperAdmin — quản lý user (chỉ super_admin)
GET    /api/v1/superadmin/users
PATCH  /api/v1/superadmin/users/:id/block            (chặn nếu :id === chính super_admin đang gọi)
PATCH  /api/v1/superadmin/users/:id/unblock
DELETE /api/v1/superadmin/users/:id                  (soft delete — chặn nếu :id === chính super_admin đang gọi)
POST   /api/v1/superadmin/users/:id/reset-password   (sinh mật khẩu mới, gửi email)
PATCH  /api/v1/superadmin/users/:id/role             (chặn tự đổi role chính mình + chặn newRole=super_admin)
GET    /api/v1/superadmin/login-methods
PATCH  /api/v1/superadmin/login-methods/:method      (bật/tắt, chặn nếu tắt hết)

SuperAdmin — quản lý role tuỳ ý (chỉ super_admin)
GET    /api/v1/superadmin/roles
POST   /api/v1/superadmin/roles                      (tạo Custom Role, isSystem=false)
PATCH  /api/v1/superadmin/roles/:id                  (đổi tên/mô tả/permission — chặn nếu isSystem=true)
DELETE /api/v1/superadmin/roles/:id                  (chặn nếu isSystem=true hoặc đang có user gán role)

SuperAdmin — quản lý permission tuỳ ý (chỉ super_admin)
GET    /api/v1/superadmin/permissions                ?assignable=true  (loại bỏ permission isRestricted khi tạo/sửa role thường)
POST   /api/v1/superadmin/permissions                (tạo permission mới, isSystem=false — chỉ có tác dụng khi có route wire authorize() vào code)
PATCH  /api/v1/superadmin/permissions/:id            (đổi mô tả/nhóm; đổi code chặn nếu isSystem=true)
DELETE /api/v1/superadmin/permissions/:id            (chặn nếu isSystem=true hoặc đang gán cho role nào)

SuperAdmin — audit log (chỉ super_admin)
GET    /api/v1/superadmin/audit-logs                 ?actorId=&entityType=&from=&to=&page=&limit=

Files & tài nguyên (đổi tên thành `media` ở Phase 4, xem ARCHITECTURE.md §8)
POST   /api/v1/files/presign                     (lấy presigned URL upload lên R2)
POST   /api/v1/files                             (lưu metadata sau khi upload xong)
GET    /api/v1/files                             ?folderId=&view=grid|list&page=&limit=
DELETE /api/v1/files/:id

Domain (chưa triển khai — viết theo README §9 khi vào Phase 5+)
GET    /api/v1/products              ?category=&occasion=&search=&minPrice=&maxPrice=&page=&limit=
POST   /api/v1/orders                 (tạo đơn từ giỏ hàng, kèm delivery info)
...
```

Tất cả response theo chuẩn ở [ARCHITECTURE.md §4](ARCHITECTURE.md#4-response--error-format-chuẩn):
```json
{ "success": true, "message": "Success", "data": {} }
{ "success": false, "message": "Validation failed", "errors": { "email": "..." } }
{ "success": true, "message": "Success", "data": [], "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
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
- Khu vực SuperAdmin: quản lý user (block/unblock, reset password, đổi role), bật/tắt phương thức đăng nhập, tạo/sửa/xoá role tuỳ ý và gán permission.
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
- Khi scale lớn: chuyển DB từ Neon sang VPS tự quản lý qua Docker, bật cron backup 2 ngày/lần lên R2 (tự xoá sau 30 ngày); cân nhắc tách `apps/client` và `apps/admin` thành 2 frontend riêng (xem [ARCHITECTURE.md §13.1](ARCHITECTURE.md#131-chọn-nextjs-hay-react--vite)).

---

## 8. Công nghệ đề xuất chi tiết

| Hạng mục | Công nghệ |
|---|---|
| Frontend | Next.js (App Router, React 19, TypeScript) cho app cần SEO; React (Vite) + TS cho app nội bộ nếu tách riêng. Validate: `zod` + `react-hook-form`. Data fetching: `@tanstack/react-query` + `axios`. Global state: `zustand`. Style: TailwindCSS |
| Backend | Node.js, Express, **TypeScript (strict)**, modular + MVC + Service Layer (xem [ARCHITECTURE.md](ARCHITECTURE.md)), Prisma ORM, `zod` validate input |
| Database | PostgreSQL — **Neon** (dev), tự quản lý qua Docker trên VPS (production khi scale) |
| Cache/Session | Redis |
| Auth | JWT + Cookie (httpOnly), bcrypt, Google OAuth, Magic link (Resend), bật/tắt phương thức qua SuperAdmin |
| Lưu trữ file/ảnh | **Cloudflare R2** (S3-compatible, free tier), presigned upload, dedup + dọn file mồ côi định kỳ |
| Thanh toán | VNPay/Momo (nội địa), Stripe (nếu cần quốc tế) |
| Email | **Resend** (cần domain riêng đã verify DKIM/SPF) — fallback **Nodemailer + SMTP** nếu chưa có domain (dễ vào spam hơn) |
| Realtime | Socket.io |
| Deploy | Docker + Docker Compose (khi lên VPS); FE (Next.js) trên Vercel, BE trên Render/Railway/VPS |
| Backup | `pg_dump` định kỳ 2 ngày/lần → Cloudflare R2, tự xoá bản backup cũ hơn 30 ngày |
| CI/CD | GitHub Actions |

---

## 9. Trạng thái hiện tại & bước tiếp theo

**Đã kiểm chứng end-to-end (bản backend JS trước rewrite)**: đăng ký, đăng nhập, `/superadmin/users` (block/unblock/xoá tự chặn chính mình), bật/tắt phương thức đăng nhập (chặn tắt hết ở cả UI lẫn backend) — test bằng Playwright thật, với Postgres local thật. Toàn bộ logic nghiệp vụ này **giữ nguyên**, chỉ đổi "vỏ" sang TypeScript + convention mới bên dưới.

**🟡 Đang làm — Phase 1 Foundation** (theo [ARCHITECTURE.md §19](ARCHITECTURE.md#19-lộ-trình-triển-khai-7-phase), chuyển toàn bộ backend sang TypeScript strict theo Master Prompt):
- ✅ Đã convert: `core/` (errors, middleware, response, logger, utils), `config/`, module `auth`, `email`, `audit-log`, `files`, `users` (self-service + admin), `roles`.
- 🚧 Đang dở: module `permissions` (mới viết `permissions.validation.ts`, chưa xong service/controller/routes).
- ⬜ Chưa làm: module `settings` (login-methods), `jobs/`, `app.ts`/`server.ts` mới (versioning `/api/v1`, graceful shutdown, request ID), `routes/v1/index.ts` gom router, xoá file `.js` cũ, cập nhật `frontend/src/lib/axios.ts` sang base URL `/api/v1`, `npm run build`/`typecheck` sạch, seed lại và test end-to-end với bản TS.
- ⬜ Prettier chưa cấu hình (yêu cầu ở [ARCHITECTURE.md §16](ARCHITECTURE.md#16-logging-environment-code-quality)).

**Còn thiếu / bước tiếp theo (sau khi xong Phase 1):**
1. Hoàn tất Phase 1 (danh sách ⬜ ở trên), seed + test lại toàn bộ luồng auth với bản TS.
2. Google OAuth thật cần `GOOGLE_CLIENT_ID` + tích hợp Google Identity Services ở frontend (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
3. UI `/superadmin/roles`, `/superadmin/permissions` (API backend đã có, chưa có trang).
4. Màn hình quản lý tài nguyên (grid/list theo folder).
5. Phase 4: đổi `files` → `media` + `StorageService` abstraction + `system_settings` tổng quát.
6. Phase 5+: viết domain thật (`backend/src/modules/domain/`, `frontend/src/features/domain/`) theo [DATABASE.md §3.4-3.6](DATABASE.md).
7. Phase 6: OpenAPI/Swagger, testing (unit/integration/API).
8. Cấu hình R2 bucket + domain Resend thật khi triển khai production.

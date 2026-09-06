# 🌸 FLOWER SHOP — Website bán hoa trực tuyến

Kế hoạch chi tiết cho website thương mại điện tử bán hoa, hướng đến người dùng thật (đặt hoa sinh nhật, cưới hỏi, khai trương, chia buồn, quà tặng...).

- **Frontend:** Next.js (React, App Router, TypeScript)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL

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
- Đăng ký/đăng nhập (email, Google OAuth).
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
- Quản lý khách hàng: thông tin, lịch sử mua hàng, phân khúc khách VIP.
- Quản lý đánh giá: duyệt/ẩn review.
- Quản lý banner trang chủ & nội dung blog.
- Thống kê & báo cáo: doanh thu theo ngày/tháng, sản phẩm bán chạy, biểu đồ dịp lễ cao điểm.
- Quản lý vai trò & phân quyền nhân viên (super_admin, store_manager, sales_staff, florist, shipper) — chi tiết tại [DATABASE.md](DATABASE.md#2-hệ-thống-vai-trò--phân-quyền-rbac).

### 2.3. Chức năng nền tảng (kỹ thuật)

- Xác thực: JWT (access + refresh token), OAuth Google.
- Upload ảnh: Cloudinary hoặc AWS S3.
- Email service: gửi xác nhận đơn hàng, nhắc lịch, khuyến mãi (Nodemailer/SendGrid).
- Thông báo real-time trạng thái đơn hàng: Socket.io.
- Thanh toán: tích hợp cổng thanh toán VN (VNPay/Momo) và/hoặc Stripe.
- Cache/session: Redis (giỏ hàng, rate limiting).
- Tìm kiếm: PostgreSQL full-text search (giai đoạn đầu), có thể nâng cấp Elasticsearch sau.
- Bảo mật: xem chi tiết đầy đủ tại **[SECURITY.md](SECURITY.md)** (auth, chống IDOR, thanh toán, dữ liệu cá nhân, hạ tầng...).

---

## 3. Kiến trúc hệ thống

```
[ Next.js App ]  <---REST/JSON--->  [ Express API ]  <--->  [ PostgreSQL ]
     |                                     |
  (App Router,                        (Redis cache,
   Server Components                   JWT auth,
   cho trang SEO,                      Socket.io,
   React Query,                        Multer/S3 upload)
   Zustand/Redux)
```

- **Kiến trúc:** Next.js đóng vai trò frontend (SSR/SSG cho trang cần SEO như trang chủ, danh mục, chi tiết sản phẩm; Client Components cho phần tương tác như giỏ hàng, checkout), gọi REST API riêng từ Express. Có thể tách thêm service thanh toán/webhook riêng nếu mở rộng.
- **Realtime:** Socket.io cho cập nhật trạng thái đơn hàng / thông báo admin có đơn mới.
- **File ảnh:** lưu ở Cloudinary/S3, DB chỉ lưu URL; tận dụng `next/image` để tối ưu ảnh hoa tự động.

---

## 4. Cấu trúc thư mục dự kiến

```
FLOWER/
├── frontend/                # Next.js app (App Router, TypeScript)
│   ├── src/
│   │   ├── app/             # routes: page.tsx, layout.tsx theo file-system routing
│   │   │   ├── (storefront)/    # nhóm route công khai: /, /products/[slug], /cart, /checkout...
│   │   │   └── admin/           # route quản trị: /admin/products, /admin/orders...
│   │   ├── components/      # UI dùng chung (Button, Card, Modal...)
│   │   ├── features/        # theo domain: auth, cart, orders, products
│   │   ├── hooks/
│   │   ├── services/        # gọi API (axios instances tới backend Express)
│   │   └── store/           # state management (client state)
│   └── package.json
│
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/          # db, env, cloudinary
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── reviews/
│   │   │   ├── promotions/
│   │   │   └── users/
│   │   ├── middlewares/     # auth, error handler, validation
│   │   ├── utils/
│   │   └── app.js
│   ├── migrations/          # DB migrations (Knex/Prisma)
│   ├── seeders/
│   └── package.json
│
├── docs/                    # tài liệu API, sơ đồ DB
└── README.md
```

> Gợi ý ORM: **Prisma** (schema-first, migration tiện, hợp với TypeScript) hoặc **Knex** nếu muốn viết query thuần hơn.

---

## 5. Thiết kế Database & Phân quyền (PostgreSQL)

Toàn bộ schema chi tiết (bảng, quan hệ, index) và hệ thống **role/permission (RBAC)** cho các vai trò nội bộ (super_admin, store_manager, sales_staff, florist, shipper) được tách riêng để dễ tra cứu:

👉 Xem chi tiết tại **[DATABASE.md](DATABASE.md)**

Tóm tắt nhanh:

- 6 vai trò: `super_admin`, `store_manager`, `sales_staff`, `florist`, `shipper`, `customer`.
- Phân quyền theo permission code (`orders.update_status`, `products.delete`...) qua bảng `roles` / `permissions` / `role_permissions`, không hard-code trong logic nghiệp vụ.
- ~20 bảng chính chia 4 nhóm: Người dùng & phân quyền, Sản phẩm, Giỏ hàng & Đơn hàng, Nội dung & Thông báo.

---

## 6. Thiết kế API (REST) — nhóm chính

```
Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/google/callback

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
- Setup dự án (Next.js, Express, PostgreSQL + Prisma).
- Auth cơ bản (đăng ký/đăng nhập).
- CRUD sản phẩm, danh mục (admin cơ bản).
- Trang chủ, danh sách sản phẩm, chi tiết sản phẩm.
- Giỏ hàng, đặt hàng (COD), chọn ngày/giờ giao hoa.
- Trang quản lý đơn hàng cho admin.

### Giai đoạn 2 — Thanh toán & trải nghiệm (3–4 tuần)
- Tích hợp cổng thanh toán online (VNPay/Momo).
- Theo dõi trạng thái đơn hàng + email thông báo.
- Đánh giá sản phẩm, wishlist.
- Sổ địa chỉ người nhận, thiệp chúc kèm đơn.

### Giai đoạn 3 — Tăng trưởng & giữ chân khách (3 tuần)
- Mã giảm giá / chương trình khuyến mãi theo dịp lễ.
- Đặt hoa theo yêu cầu riêng (custom bouquet).
- Nhắc lịch đặc biệt (sinh nhật/kỷ niệm) qua email.
- Blog, newsletter.

### Giai đoạn 4 — Mở rộng
- Dashboard thống kê nâng cao cho admin.
- Chat hỗ trợ / chatbot tư vấn chọn hoa.
- Responsive/PWA để dùng tốt trên mobile, tối ưu SEO.
- Đa chi nhánh / đa khu vực giao hàng (nếu mở rộng kinh doanh).

---

## 8. Công nghệ đề xuất chi tiết

| Hạng mục | Công nghệ |
|---|---|
| Frontend | Next.js (App Router, React 19, TypeScript), React Query/TanStack Query, Zustand hoặc Redux Toolkit, TailwindCSS |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL |
| Cache/Session | Redis |
| Auth | JWT, bcrypt, Google OAuth |
| Upload ảnh | Cloudinary hoặc AWS S3 |
| Thanh toán | VNPay/Momo (nội địa), Stripe (nếu cần quốc tế) |
| Email | Nodemailer + SendGrid/Mailgun |
| Realtime | Socket.io |
| Deploy | Docker + Docker Compose; FE (Next.js) trên Vercel, BE trên Render/Railway/VPS |
| CI/CD | GitHub Actions |

---

## 9. Bước tiếp theo

1. Xác nhận phạm vi MVP (những chức năng nào bắt buộc có ngay từ đầu).
2. Khởi tạo 2 project con: `frontend/` (Next.js — đã scaffold xong) và `backend/` (Express).
3. Thiết kế schema Prisma dựa trên mục 5 và chạy migration đầu tiên.
4. Dựng khung API cho `auth` và `products` trước để có dữ liệu hiển thị lên FE.

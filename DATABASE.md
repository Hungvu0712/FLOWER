# 🗄️ Thiết kế Database & Phân quyền (PostgreSQL)

Tài liệu này mô tả chi tiết schema database và hệ thống phân quyền (Role-Based Access Control) cho dự án Flower Shop. Xem tổng quan chức năng và roadmap tại [README.md](README.md).

---

## 1. Nguyên tắc thiết kế

- Chuẩn hoá (normalize) đến 3NF cho dữ liệu giao dịch (orders, products...), tránh trùng lặp.
- Dùng `id` dạng `BIGSERIAL`/`UUID` làm khoá chính (khuyến nghị UUID cho `users`, `orders` để không lộ số lượng đơn hàng qua ID).
- Timestamp chuẩn: mọi bảng có `created_at`, `updated_at` (trừ bảng thuần many-to-many).
- Xoá mềm (soft delete) cho `products`, `users`, `blog_posts` bằng cột `deleted_at` để không mất dữ liệu lịch sử đơn hàng khi sản phẩm bị gỡ.
- Phân quyền tách rời khỏi bảng `users` (không hard-code role bằng enum) để dễ mở rộng khi shop có thêm vai trò nhân viên mới.

---

## 2. Hệ thống Vai trò & Phân quyền (RBAC)

### 2.1. Vì sao cần RBAC chi tiết cho shop hoa

Một shop hoa vận hành thật có nhiều vai trò nội bộ với phạm vi thao tác khác nhau, không chỉ đơn giản là "admin/user":

| Vai trò | Mô tả | Ai dùng |
|---|---|---|
| `super_admin` | Toàn quyền hệ thống: quản lý nhân viên, cấu hình thanh toán/API keys, xem mọi báo cáo | Chủ shop |
| `store_manager` | Quản lý sản phẩm, danh mục, khuyến mãi, xem báo cáo doanh thu, KHÔNG quản lý được tài khoản nhân viên khác | Quản lý cửa hàng |
| `sales_staff` | Xử lý đơn hàng, chăm sóc khách hàng, xem/cập nhật trạng thái đơn, KHÔNG xoá sản phẩm, KHÔNG xem báo cáo tài chính | Nhân viên bán hàng/CSKH |
| `florist` | Xem danh sách đơn cần chuẩn bị hoa, cập nhật trạng thái "đã soạn xong", KHÔNG truy cập thông tin thanh toán | Nhân viên cắm hoa |
| `shipper` | Xem đơn được phân công giao, cập nhật trạng thái giao hàng (đang giao/đã giao/giao thất bại) | Người giao hàng |
| `customer` | Chỉ thao tác trên dữ liệu của chính mình (đơn hàng, địa chỉ, wishlist, review) | Khách hàng |

> Thiết kế permission theo **code dạng chuỗi** (`orders.update_status`) thay vì hard-code role trong logic nghiệp vụ, để khi thêm vai trò mới chỉ cần cấu hình lại bảng `role_permissions`, không phải sửa code.

### 2.2. Bảng dữ liệu

```sql
-- Vai trò
roles
  id            SERIAL PRIMARY KEY
  code          VARCHAR(50) UNIQUE NOT NULL   -- 'super_admin', 'sales_staff', 'customer'...
  name          VARCHAR(100) NOT NULL          -- tên hiển thị
  description   TEXT
  is_system     BOOLEAN DEFAULT false          -- true = vai trò hệ thống, không cho xoá

-- Quyền hạn (đơn vị nhỏ nhất có thể cấp)
permissions
  id            SERIAL PRIMARY KEY
  code          VARCHAR(100) UNIQUE NOT NULL   -- 'products.create', 'orders.view_all'...
  group_name    VARCHAR(50) NOT NULL           -- 'products', 'orders', 'reports'... (để gom nhóm trên UI)
  description   TEXT

-- Gán quyền cho vai trò (n-n)
role_permissions
  role_id        INT REFERENCES roles(id) ON DELETE CASCADE
  permission_id  INT REFERENCES permissions(id) ON DELETE CASCADE
  PRIMARY KEY (role_id, permission_id)

-- Gán vai trò cho user (n-n — cho phép 1 nhân viên có nhiều vai trò, vd sales kiêm florist ở shop nhỏ)
user_roles
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE
  role_id   INT REFERENCES roles(id) ON DELETE CASCADE
  PRIMARY KEY (user_id, role_id)
```

> Với shop quy mô nhỏ có thể đơn giản hoá bằng cách thêm cột `role_id` trực tiếp vào `users` (1 user = 1 role). Thiết kế `user_roles` many-to-many ở trên chỉ nên dùng nếu dự tính nhân viên có thể kiêm nhiệm nhiều vai trò.

### 2.3. Danh sách permission đề xuất

| Nhóm | Permission code | Ý nghĩa |
|---|---|---|
| products | `products.view` | Xem danh sách/chi tiết sản phẩm (admin panel) |
| products | `products.create` | Thêm sản phẩm mới |
| products | `products.update` | Sửa sản phẩm, tồn kho |
| products | `products.delete` | Xoá/ẩn sản phẩm |
| categories | `categories.manage` | Thêm/sửa/xoá danh mục, dịp lễ |
| orders | `orders.view_own` | Khách xem đơn của chính mình |
| orders | `orders.view_all` | Xem toàn bộ đơn hàng hệ thống |
| orders | `orders.update_status` | Cập nhật trạng thái đơn (chuẩn bị/giao/hoàn tất) |
| orders | `orders.assign_shipper` | Phân công người giao hàng |
| orders | `orders.cancel` | Huỷ đơn hàng |
| orders | `orders.view_delivery_queue` | Xem hàng đợi cần soạn hoa (florist) |
| orders | `orders.view_shipping_queue` | Xem đơn cần giao (shipper) |
| customers | `customers.view` | Xem thông tin khách hàng |
| customers | `customers.manage` | Sửa/khoá tài khoản khách hàng |
| promotions | `promotions.manage` | Tạo/sửa mã giảm giá, chương trình sale |
| reviews | `reviews.moderate` | Duyệt/ẩn đánh giá |
| reports | `reports.view` | Xem thống kê doanh thu, báo cáo |
| blog | `blog.manage` | Quản lý bài viết blog, banner |
| staff | `staff.manage` | Tạo/sửa/xoá tài khoản nhân viên, gán vai trò (chỉ super_admin) |
| settings | `settings.manage` | Cấu hình hệ thống, API key thanh toán/email |

### 2.4. Ma trận Vai trò × Quyền (mặc định seed)

| Permission | super_admin | store_manager | sales_staff | florist | shipper | customer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| products.view | ✅ | ✅ | ✅ | – | – | – |
| products.create/update/delete | ✅ | ✅ | – | – | – | – |
| categories.manage | ✅ | ✅ | – | – | – | – |
| orders.view_own | – | – | – | – | – | ✅ |
| orders.view_all | ✅ | ✅ | ✅ | – | – | – |
| orders.update_status | ✅ | ✅ | ✅ | ✅ (chỉ trạng thái soạn hoa) | ✅ (chỉ trạng thái giao) | – |
| orders.assign_shipper | ✅ | ✅ | ✅ | – | – | – |
| orders.cancel | ✅ | ✅ | ✅ | – | – | ✅ (trong khung giờ cho phép) |
| orders.view_delivery_queue | ✅ | ✅ | – | ✅ | – | – |
| orders.view_shipping_queue | ✅ | ✅ | – | – | ✅ | – |
| customers.view/manage | ✅ | ✅ | ✅ (chỉ view) | – | – | – |
| promotions.manage | ✅ | ✅ | – | – | – | – |
| reviews.moderate | ✅ | ✅ | – | – | – | – |
| reports.view | ✅ | ✅ | – | – | – | – |
| blog.manage | ✅ | ✅ | – | – | – | – |
| staff.manage | ✅ | – | – | – | – | – |
| settings.manage | ✅ | – | – | – | – | – |

> Ma trận này sẽ là dữ liệu **seed** ban đầu cho `role_permissions`. Admin (`super_admin`) có thể chỉnh sửa quyền cho từng vai trò trực tiếp qua UI ở giai đoạn 4 (Advanced), không cần sửa code.

### 2.5. Áp dụng ở tầng Backend (Express)

```
Request → authenticate (verify JWT, load user + roles + permissions vào req.user)
        → authorize('orders.update_status') middleware
        → Controller xử lý
```

Ví dụ middleware:
```js
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    const userPermissions = req.user.permissions; // load kèm lúc login, cache vào JWT payload hoặc Redis
    const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
    if (!hasPermission) return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
  };
}

router.patch('/api/orders/:id/status', authenticate, authorize('orders.update_status'), updateOrderStatus);
```

- Với đơn hàng, cần kiểm tra thêm **phạm vi dữ liệu** (row-level), không chỉ permission chung:
  - `florist` chỉ được cập nhật đơn đang ở trạng thái "đang chuẩn bị", không được sửa giá/thanh toán.
  - `shipper` chỉ thấy/sửa đơn **đã được phân công cho chính mình** (`order_deliveries.shipper_id = req.user.id`).
  - `customer` chỉ thấy đơn có `orders.user_id = req.user.id`.

### 2.6. Áp dụng ở tầng Frontend (Next.js)

- Lưu danh sách `permissions` của user trong store (Zustand/Redux) sau khi đăng nhập, hoặc đọc từ session (cookie httpOnly) trong Server Component cho các route `/admin/*`.
- Route protection cho khu vực quản trị: dùng `middleware.js` (Next.js Middleware) để chặn truy cập `/admin/*` ngay ở edge nếu chưa đăng nhập/không đủ quyền, kết hợp kiểm tra permission trong layout của từng nhóm route (`app/admin/layout.js`).
- Ẩn nút/thao tác trên UI theo permission (vd nút "Xoá sản phẩm" chỉ hiện với `products.delete`), nhưng **backend (Express API) vẫn phải kiểm tra lại** — không tin tưởng riêng phía client.

---

## 3. Schema Database đầy đủ

### 3.1. Nhóm Người dùng & Phân quyền

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `users` | id, name, email, password_hash, phone, avatar_url, status (active/locked), email_verified_at, created_at, updated_at, deleted_at | |
| `roles` | id, code, name, description, is_system | Xem mục 2.2 |
| `permissions` | id, code, group_name, description | Xem mục 2.2 |
| `role_permissions` | role_id, permission_id | |
| `user_roles` | user_id, role_id | |
| `addresses` | id, user_id, recipient_name, phone, address_line, ward, district, city, is_default | Sổ địa chỉ người nhận |
| `special_dates` | id, user_id, label, date, remind_days_before | Nhắc lịch sinh nhật/kỷ niệm |

### 3.2. Nhóm Sản phẩm

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `categories` | id, name, slug, parent_id, image | Danh mục con dạng cây |
| `occasions` | id, name (Sinh nhật, Valentine...) | Tag dịp lễ |
| `products` | id, name, slug, description, base_price, category_id, thumbnail, status, stock, deleted_at | |
| `product_images` | id, product_id, url, sort_order | |
| `product_variants` | id, product_id, name (Nhỏ/Vừa/Lớn), price, stock | |
| `product_occasions` | product_id, occasion_id | n-n |
| `reviews` | id, product_id, user_id, rating, comment, images, is_approved, created_at | |
| `wishlists` | user_id, product_id | |

### 3.3. Nhóm Giỏ hàng & Đơn hàng

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `carts` | id, user_id (nullable), session_id | Hỗ trợ guest cart |
| `cart_items` | id, cart_id, product_id, variant_id, quantity, note | |
| `orders` | id, user_id, order_code, status, subtotal, discount, shipping_fee, total, payment_method, payment_status, created_at | |
| `order_items` | id, order_id, product_id, variant_id, quantity, price, card_message | Thiệp chúc kèm đơn |
| `order_deliveries` | order_id, recipient_name, recipient_phone, address, delivery_date, delivery_time_slot, shipper_id | `shipper_id` phục vụ row-level check ở mục 2.5 |
| `order_status_history` | id, order_id, status, note, changed_at, changed_by (user_id) | Truy vết ai đổi trạng thái gì |
| `payments` | id, order_id, provider, transaction_id, amount, status, paid_at | |
| `coupons` | id, code, type, value, min_order_value, start_date, end_date, usage_limit | |
| `coupon_usages` | coupon_id, order_id, user_id | |

### 3.4. Nhóm Nội dung & Thông báo

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `blog_posts` | id, author_id, title, slug, content, thumbnail, published_at | |
| `notifications` | id, user_id, type, message, is_read, created_at | |

### 3.5. Quan hệ chính (ERD rút gọn)

```
users ──< user_roles >── roles ──< role_permissions >── permissions
users ──< addresses
users ──< special_dates
users ──< orders ──< order_items >── products ──< product_variants
orders ──1:1─ order_deliveries (shipper_id → users)
orders ──< order_status_history (changed_by → users)
orders ──< payments
products ──< product_images
products >──< occasions (qua product_occasions)
products >──< categories (n:1, có parent_id tự tham chiếu)
carts ──< cart_items >── products
```

### 3.6. Index quan trọng

- `users(email)` unique.
- `products(slug)` unique, `products(category_id)`, full-text index (`GIN`) trên `products(name, description)`.
- `orders(order_code)` unique, `orders(user_id)`, `orders(status)`.
- `order_deliveries(delivery_date)` — phục vụ dashboard lịch giao hoa.
- `order_deliveries(shipper_id)` — truy vấn nhanh đơn của từng shipper.
- `role_permissions(role_id)`, `user_roles(user_id)` — tăng tốc kiểm tra quyền lúc auth.

---

## 4. Seed dữ liệu ban đầu

Khi khởi tạo DB, cần seed sẵn:
1. 6 `roles` ở mục 2.1.
2. Toàn bộ `permissions` ở mục 2.3.
3. Ma trận `role_permissions` theo mục 2.4.
4. 1 tài khoản `super_admin` mặc định (đổi mật khẩu ngay sau lần đăng nhập đầu).

---

## 5. Gợi ý triển khai bằng Prisma

```prisma
model Role {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  isSystem    Boolean  @default(false)
  permissions RolePermission[]
  users       UserRole[]
}

model Permission {
  id        Int      @id @default(autoincrement())
  code      String   @unique
  groupName String
  roles     RolePermission[]
}

model RolePermission {
  roleId       Int
  permissionId Int
  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])
  @@id([roleId, permissionId])
}

model UserRole {
  userId String
  roleId Int
  user   User @relation(fields: [userId], references: [id])
  role   Role @relation(fields: [roleId], references: [id])
  @@id([userId, roleId])
}
```

Đây là điểm bắt đầu tốt để chạy `npx prisma migrate dev` cho migration đầu tiên.

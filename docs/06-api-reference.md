# 06 · API Reference

Base URL: `http://localhost:4000` (dev) · mọi endpoint mount dưới **`/api/v1`**.
Ngoại lệ duy nhất không versioning: `GET /health`.

> Đây là tài liệu **viết tay**, có thể lệch với code khi có thay đổi. Nguồn sự thật là các file
> `*.routes.ts` + `*.validation.ts` trong `backend/src/modules/`.
> Kế hoạch thay bằng **OpenAPI/Swagger** sinh tự động — xem [12 · Đề xuất](12-danh-gia-va-de-xuat.md).

---

## 1. Quy ước chung

### Xác thực

Token nằm ở **cookie `httpOnly`**, trình duyệt tự đính kèm khi gọi với `withCredentials: true`.
Client không phải trình duyệt có thể dùng `Authorization: Bearer <access_token>`.

| Cookie | Nội dung | Thời hạn | `path` |
|---|---|---|---|
| `access_token` | JWT, payload chỉ chứa `sub` (user id) | `JWT_ACCESS_EXPIRES_IN` (mặc định 5 phút) | `/` |
| `refresh_token` | Chuỗi ngẫu nhiên 32 byte; DB chỉ lưu `sha256` | 30 ngày | `/api/v1` |

> `refresh_token` để `path=/api/v1` (không hẹp hơn) vì `/api/v1/account/sessions` cần đọc cookie này
> để biết phiên nào là "phiên hiện tại".

### Response

```jsonc
// Thành công
{ "success": true, "message": "Success", "data": {} }

// Danh sách có phân trang
{ "success": true, "message": "Success", "data": [],
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }

// Lỗi validate (422)
{ "success": false, "message": "Validation failed", "errors": { "email": "Email không hợp lệ" } }

// Lỗi nghiệp vụ
{ "success": false, "message": "Bạn không có quyền thực hiện thao tác này", "code": "FORBIDDEN" }
```

Bảng mã lỗi đầy đủ: [03 · Backend §3](03-backend.md#bảng-mã-lỗi-code).

### Header

| Header | Chiều | Ý nghĩa |
|---|---|---|
| `X-Request-Id` | vào (tuỳ chọn) / ra (luôn có) | ID trace request; gửi kèm khi báo lỗi để tra log server |

### Cột "Quyền" trong các bảng dưới

| Ký hiệu | Nghĩa |
|---|---|
| — | Công khai, không cần đăng nhập |
| 🔑 | Cần đăng nhập (bất kỳ role nào) |
| `permission.code` | Cần đăng nhập **và** có permission đó |

---

## 2. Bản đồ endpoint

```mermaid
flowchart LR
    ROOT["/api/v1"] --> AUTH["/auth<br/>— công khai"]
    ROOT --> ACC["/account<br/>🔑 authenticate"]
    ROOT --> FILES["/files<br/>🔑 + files.manage cho ghi/xoá"]
    ROOT --> CAT["/categories<br/>— công khai, storefront"]
    ROOT --> PROD["/products<br/>— công khai, storefront"]
    ROOT --> ORD["/orders<br/>— công khai, guest checkout, rate limit 10/15p"]
    ROOT --> CONTACT["/contact<br/>— công khai, rate limit 5/15p"]
    ROOT --> ADM["/admin/*<br/>🔑 nghiệp vụ domain"]
    ROOT --> SA["/superadmin/*<br/>🔑 quản trị hệ thống"]

    AUTH --> A1["register · login · logout · refresh<br/>magic-link/request · magic-link/verify<br/>google · forgot-password · reset-password<br/>login-methods"]
    ACC --> C1["me · profile · change-password<br/>sessions (list · revoke 1 · revoke khác)"]
    ADM --> AD1["/admin/categories<br/>categories.manage"]
    ADM --> AD2["/admin/products<br/>products.manage"]
    ADM --> AD3["/admin/contact-messages<br/>contact.manage"]
    ADM --> AD4["/admin/orders<br/>orders.view_all · update_status · cancel"]
    SA --> S1["/users → users.manage 🔒"]
    SA --> S2["/roles → roles.manage 🔒"]
    SA --> S3["/permissions → permissions.manage 🔒"]
    SA --> S4["/login-methods → settings.manage 🔒"]
    SA --> S5["/audit-logs → audit.view"]

    HEALTH["/health<br/>ngoài versioning"]

    style SA fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style ADM fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
    style AUTH fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

---

## 3. Health

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/health` | — | Health check cho load balancer / uptime monitor |

```json
{ "success": true, "data": { "status": "ok" } }
```

---

## 4. Auth — `/api/v1/auth`

| Method | Path | Quyền | Rate limit | Mô tả |
|---|---|---|---|---|
| `GET` | `/login-methods` | — | — | Phương thức đăng nhập đang bật (FE ẩn/hiện nút tương ứng) |
| `POST` | `/register` | — | 20 / 15 phút | Đăng ký bằng email + mật khẩu — **không** tự đăng nhập |
| `POST` | `/login` | — | 20 / 15 phút | Đăng nhập email + mật khẩu |
| `POST` | `/magic-link/request` | — | **5 / 15 phút** | Gửi liên kết đăng nhập qua email |
| `POST` | `/magic-link/verify` | — | — | Đăng nhập bằng token magic link (dùng 1 lần) |
| `POST` | `/google` | — | 20 / 15 phút | Đăng nhập bằng Google ID token |
| `POST` | `/refresh` | cookie `refresh_token` | — | Cấp cặp token mới (*rotation*) |
| `POST` | `/logout` | cookie `refresh_token` | — | Thu hồi phiên + xoá cookie |
| `POST` | `/forgot-password` | — | 20 / 15 phút | Gửi email đặt lại mật khẩu |
| `POST` | `/reset-password` | — | 20 / 15 phút | Đặt lại mật khẩu bằng token |

### `POST /api/v1/auth/register`

```jsonc
// Request
{ "fullName": "Nguyễn Văn A", "email": "a@example.com", "password": "matkhau123" }
// 200 — không set cookie, người dùng tự đăng nhập lại
{ "success": true, "message": "Đăng ký thành công, vui lòng đăng nhập.",
  "data": { "user": { "id": "uuid", "email": "a@example.com", "fullName": "Nguyễn Văn A", "...": "..." } } }
```

Ràng buộc: `fullName` ≥ 1 ký tự · `email` đúng định dạng · `password` ≥ 8 ký tự.
Lỗi: `409 EMAIL_TAKEN` · `403 LOGIN_METHOD_DISABLED`.

### `POST /api/v1/auth/login`

```jsonc
{ "email": "a@example.com", "password": "matkhau123" }
// 200 + Set-Cookie: access_token, refresh_token
{ "success": true, "message": "Success", "data": { "user": { "...": "..." } } }
```

Lỗi: `401 INVALID_CREDENTIALS` · `403 ACCOUNT_BLOCKED` · `403 LOGIN_METHOD_DISABLED` ·
`429 ACCOUNT_TEMPORARILY_LOCKED` (docs/12 BE-17 — sai mật khẩu ≥ 5 lần liên tiếp, cooldown tăng dần
1→2→4→...→30 phút; reset về 0 khi đăng nhập đúng. Trả 429 NGAY, không verify mật khẩu, kể cả gửi
đúng mật khẩu trong lúc đang khoá).

> Sai email và sai mật khẩu trả **cùng một** thông điệp — không tiết lộ email nào có tài khoản.
> Rate limit theo IP **và** theo email (docs/12 BE-16) — 2 lớp giới hạn tần suất, cộng thêm cơ chế
> khoá tạm ở trên; cả 3 ngưỡng hiện là hằng số trong code, chưa cấu hình được qua biến môi trường.

### `POST /api/v1/auth/magic-link/request`

```jsonc
{ "email": "a@example.com" }
// 200 — LUÔN thành công, kể cả email không tồn tại (chống dò tài khoản)
{ "success": true, "message": "Nếu email tồn tại, liên kết đăng nhập đã được gửi.", "data": null }
```

### `POST /api/v1/auth/magic-link/verify`

```jsonc
{ "token": "<token từ link trong email>" }
// 200 + Set-Cookie
{ "success": true, "data": { "user": { "...": "..." } } }
```

Token **dùng 1 lần**, TTL mặc định 15 phút. Email chưa có tài khoản → tự tạo tài khoản
(magic link kiêm luôn vai trò "đăng ký nhanh"). Lỗi: `401 INVALID_MAGIC_LINK`.

### `POST /api/v1/auth/google`

```jsonc
{ "idToken": "<ID token từ Google Identity Services>" }
```

Backend verify ID token bằng `google-auth-library` với `audience = GOOGLE_CLIENT_ID`.
Lỗi: `401 INVALID_GOOGLE_TOKEN` · `403 LOGIN_METHOD_DISABLED`.

### `POST /api/v1/auth/refresh`

Không có body — đọc cookie `refresh_token`. Thu hồi token cũ, phát hành cặp mới (*rotation*).
Lỗi: `401 UNAUTHENTICATED` (thiếu cookie) · `401 SESSION_EXPIRED`.

### `POST /api/v1/auth/forgot-password` · `/reset-password`

```jsonc
// forgot-password — luôn trả 200 dù email không tồn tại
{ "email": "a@example.com" }

// reset-password
{ "token": "<token từ email>", "newPassword": "matkhaumoi123" }
```

Lỗi: `401 INVALID_RESET_TOKEN` (sai / hết hạn / đã dùng).

---

## 5. Account — `/api/v1/account` 🔑

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/me` | 🔑 | Hồ sơ + **`roles`/`permissions` hiện tại từ DB** |
| `PATCH` | `/profile` | 🔑 | Sửa `fullName`, `phone`, `avatarFileId` |
| `POST` | `/change-password` | 🔑 | Đổi mật khẩu |
| `GET` | `/sessions` | 🔑 | Danh sách thiết bị đang đăng nhập |
| `DELETE` | `/sessions/:id` | 🔑 | Đăng xuất **một** thiết bị |
| `DELETE` | `/sessions` | 🔑 | Đăng xuất **tất cả thiết bị khác** (giữ phiên hiện tại) |

### `GET /api/v1/account/me`

```jsonc
{ "success": true, "data": {
    "id": "uuid", "fullName": "Nguyễn Văn A", "email": "a@example.com",
    "phone": null, "avatarFileId": null, "avatarFile": null,
    "status": "active", "emailVerifiedAt": null,
    "roles": ["super_admin"],
    "permissions": ["users.manage", "roles.manage", "categories.manage", "..."]
} }
```

`roles`/`permissions` luôn tra **mới từ DB** — frontend dùng để cập nhật menu ngay sau F5,
không cần đăng xuất/đăng nhập lại. Trường `passwordHash` **không bao giờ** xuất hiện trong response.

### `PATCH /api/v1/account/profile`

```jsonc
{ "fullName": "Tên mới", "phone": "0900000000", "avatarFileId": "uuid-file" }
```

Mọi trường đều tuỳ chọn. Đặt `avatarFileId` sẽ ghi `file_usages` (`entity_type = user_avatar`),
ảnh cũ tự hết được tính là đang dùng và sẽ bị cron dọn sau.

### `POST /api/v1/account/change-password`

```jsonc
{ "currentPassword": "cu123456", "newPassword": "moi12345678" }
```

Tài khoản chưa từng có mật khẩu (chỉ đăng nhập Google/magic link) được phép đặt mật khẩu mới mà
không cần `currentPassword` khớp. Lỗi: `401 INVALID_CURRENT_PASSWORD`.

### `GET /api/v1/account/sessions`

```jsonc
{ "success": true, "data": [
  { "id": "uuid", "deviceName": "Chrome trên macOS", "ipAddress": "1.2.3.4",
    "lastActiveAt": "2026-09-09T02:00:00.000Z", "createdAt": "...", "isCurrent": true }
] }
```

---

## 6. Files — `/api/v1/files` 🔑

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/presign` | 🔑 | Lấy chữ ký để upload thẳng lên Cloudinary |
| `POST` | `/` | 🔑 | Lưu metadata sau khi upload xong (server tự tra lại metadata thật từ Cloudinary) |
| `GET` | `/` | `files.manage` | Danh sách file (phân trang) |
| `DELETE` | `/:id` | `files.manage` | Xoá mềm (Cloudinary object bị purge ở lượt cron sau) |

### `POST /api/v1/files/presign`

```jsonc
// Request — zod validate mime/size chỉ để phản hồi sớm cho UX, KHÔNG phải ràng buộc mật mã học
{ "originalName": "hoa-hong.jpg", "mimeType": "image/jpeg", "sizeBytes": 204800, "folderId": null }
// Response
{ "success": true, "data": {
    "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud_name>/image/upload",
    "publicId": "uploads/2026-09-09/<uuid>",
    "timestamp": 1757404800,
    "signature": "<HMAC-SHA1 hex>",
    "apiKey": "<CLOUDINARY_API_KEY>",
    "allowedFormats": "jpg,jpeg,png,webp,gif,pdf",
    "folderId": null
} }
```

Ràng buộc: `mimeType` ∈ `image/jpeg` · `image/png` · `image/webp` · `image/gif` · `application/pdf`;
`sizeBytes` ≤ **10 MB** (chỉ ở tầng zod, không chặn được ở bước upload thật lên Cloudinary — xem
[modules/core-files.md §4](modules/core-files.md#4-bảo-mật)). Chữ ký chỉ ràng buộc **định dạng**
(`allowedFormats`) — tính cục bộ bằng HMAC-SHA1, không có "hạn 5 phút" như presigned URL S3 trước đây.
`publicId` là UUID ngẫu nhiên, **không có phần mở rộng** (Cloudinary tự nhận diện định dạng thật) và
không dùng tên gốc — tránh *path traversal* và trùng tên.

Frontend dùng response này để tự dựng `FormData` (file, `apiKey`, `timestamp`, `signature`,
`publicId`, `allowedFormats`) và `POST` thẳng lên `uploadUrl`.

### `POST /api/v1/files`

```jsonc
{ "publicId": "uploads/2026-09-09/<uuid>", "originalName": "hoa-hong.jpg", "folderId": null }
// 201 — server gọi Cloudinary Admin API lấy url/mimeType/sizeBytes THẬT, không tin client khai
// 404 FILE_NOT_FOUND nếu publicId không tồn tại trên Cloudinary
// 422 FILE_TOO_LARGE nếu > 10MB (file bị xoá luôn trên Cloudinary, không tạo bản ghi DB)
```

### `GET /api/v1/files?folderId=&view=grid|list&page=1&limit=24`

Trả về dạng phân trang (`data` + `meta`). `limit` tối đa 100, mặc định 24.

---

## 6b. Folders — `/api/v1/folders` 🔑 (docs/12 BE-19)

Cây thư mục cho màn quản lý tài nguyên (file/ảnh) — mọi route đều cần `files.manage`.

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/?parentId=` | `files.manage` | Danh sách thư mục con của `parentId`; bỏ trống = cấp gốc |
| `POST` | `/` | `files.manage` | Tạo thư mục |
| `PATCH` | `/:id` | `files.manage` | Sửa tên và/hoặc di chuyển (`parentId`) |
| `DELETE` | `/:id` | `files.manage` | Xoá — **chỉ khi thư mục rỗng** |

```jsonc
// POST / — tạo thư mục gốc hoặc thư mục con
{ "name": "Ảnh sản phẩm", "parentId": null }
// 201
{ "success": true, "data": {
    "id": "uuid", "name": "Ảnh sản phẩm", "parentId": null, "createdBy": "uuid",
    "createdAt": "...", "_count": { "folders": 0, "files": 0 }
} }
```

Lỗi: `404 PARENT_NOT_FOUND` (thư mục cha không tồn tại) · `400 FOLDER_CYCLE` (chọn chính nó hoặc
thư mục con làm cha — logic giống hệt `assertNoCycle` của Categories) · `409 FOLDER_NOT_EMPTY` (xoá
thư mục còn thư mục con hoặc file bên trong — phải chuyển/xoá trước).

> Đây là API nền tảng cho "Màn hình quản lý tài nguyên (cây thư mục, grid/list)" — **màn hình UI
> chưa được xây** trong lần này (nằm ngoài ước lượng 6 giờ của BE-19), chỉ mới có API.

---

## 7. Categories 🌸

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/categories` | — | Danh mục đang bật, cho storefront |
| `GET` | `/api/v1/admin/categories?includeInactive=` | `categories.manage` | Danh sách đầy đủ |
| `POST` | `/api/v1/admin/categories` | `categories.manage` | Tạo danh mục |
| `PATCH` | `/api/v1/admin/categories/:id` | `categories.manage` | Sửa danh mục |
| `DELETE` | `/api/v1/admin/categories/:id` | `categories.manage` | Xoá danh mục |

### `GET /api/v1/categories` (công khai)

Chỉ trả trường cần hiển thị — **không** lộ `sortOrder`/timestamps nội bộ:

```jsonc
{ "success": true, "data": [
  { "id": "uuid", "name": "Hoa sinh nhật", "slug": "hoa-sinh-nhat",
    "description": null, "parentId": null, "imageFile": null }
] }
```

### `POST /api/v1/admin/categories`

```jsonc
{ "name": "Hoa cưới", "slug": "hoa-cuoi", "description": "...",
  "imageFileId": "uuid", "parentId": null, "sortOrder": 0, "isActive": true }
```

- Bỏ trống `slug` → tự sinh từ `name` (bỏ dấu tiếng Việt: "Hoa cưới" → `hoa-cuoi`).
- Slug trùng → tự thêm hậu tố `-2`, `-3`...
- **Đổi `name` không tự đổi `slug`** — tránh gãy link đã chia sẻ; chỉ đổi khi sửa `slug` thủ công.

Lỗi: `400 CATEGORY_CYCLE` (chọn danh mục con làm cha) · `404 PARENT_NOT_FOUND` ·
`409 CATEGORY_HAS_CHILDREN` (xoá khi còn con).

---

## 8. Products 🌸

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/api/v1/products?categoryId=&page=&limit=` | — | Sản phẩm đang bật, cho storefront (phân trang) |
| `GET` | `/api/v1/products/:slug` | — | Chi tiết 1 sản phẩm đang bật theo `slug`, cho trang chi tiết storefront |
| `GET` | `/api/v1/admin/products?includeInactive=&categoryId=&page=&limit=` | `products.manage` | Danh sách đầy đủ (phân trang) |
| `POST` | `/api/v1/admin/products` | `products.manage` | Tạo sản phẩm |
| `PATCH` | `/api/v1/admin/products/:id` | `products.manage` | Sửa sản phẩm |
| `DELETE` | `/api/v1/admin/products/:id` | `products.manage` | Xoá mềm sản phẩm |

### `GET /api/v1/products` (công khai)

Trả về dạng phân trang (`data` + `meta`), mỗi sản phẩm kèm `category` và `images` (đã sắp theo
`sortOrder`) — **KHÔNG** có `isActive`/`createdAt`/`updatedAt`/`categoryId` (nội bộ, và `categoryId`
dư thừa vì đã có object `category`), khác `GET /api/v1/admin/products` trả đủ trường:

```jsonc
{ "success": true, "data": [
  { "id": "uuid", "name": "Bó hoa hồng đỏ", "slug": "bo-hoa-hong-do",
    "description": null, "basePrice": 350000,
    "category": { "id": "uuid", "name": "Hoa bó", "slug": "hoa-bo" },
    "images": [{ "id": "uuid", "sortOrder": 0, "file": { "id": "uuid", "url": "https://res.cloudinary.com/..." } }] }
], "meta": { "page": 1, "limit": 24, "total": 1, "totalPages": 1 } }
```

`basePrice` là số nguyên VND (không có đơn vị lẻ, không dùng kiểu Decimal) — xem
[modules/domain-products.md](modules/domain-products.md). `description` là **HTML đã sanitize** (rich
text — xem [modules/domain-products.md §9](modules/domain-products.md#9-mô-tả-dạng-rich-text)), không
phải văn bản thuần — client tự chịu trách nhiệm render đúng (hoặc dùng
`stripHtml()` để lấy bản tóm tắt văn bản thuần nếu chỉ cần preview).

### `GET /api/v1/products/:slug` (công khai)

Cùng shape 1 phần tử của `GET /api/v1/products` (không có `isActive`/`createdAt`/`updatedAt`/
`categoryId`). `404 NOT_FOUND` khi `slug` không tồn tại, hoặc sản phẩm đã ẩn (`isActive: false`)
hay đã xoá mềm — storefront không phân biệt 2 trường hợp này với người dùng (cùng hiện trang 404).

### `POST /api/v1/admin/products`

```jsonc
{ "name": "Bó hoa hồng đỏ", "slug": "bo-hoa-hong-do",
  "description": "<p>Bó hoa gồm <strong>10 bông hồng đỏ</strong> tươi.</p>",
  "basePrice": 350000, "categoryId": "uuid", "isActive": true,
  "imageFileIds": ["uuid-1", "uuid-2"] }
```

- `description`: server **sanitize lại** bằng allowlist thẻ trước khi lưu (bỏ mọi thẻ/attribute
  không nằm trong danh sách cho phép, kể cả `<script>`/`onclick`/`href`) — gửi gì cũng an toàn, không
  cần tự sanitize phía client trước khi gửi.

- Bỏ trống `slug` → tự sinh từ `name`, trùng thì tự thêm hậu tố `-2`, `-3`... (giống categories).
- **Đổi `name` không tự đổi `slug`** — chỉ đổi khi sửa `slug` thủ công.
- `imageFileIds`: **toàn bộ** bộ ảnh hiện tại, ĐÚNG thứ tự hiển thị — gửi lại ở `PATCH` là **thay thế**
  hoàn toàn bộ ảnh cũ, không phải thêm vào. Bỏ trống field này (không gửi) ở `PATCH` thì không đụng gì
  tới bộ ảnh hiện có; gửi mảng rỗng `[]` thì xoá hết ảnh.

Lỗi: `404 CATEGORY_NOT_FOUND` (categoryId không tồn tại) · `404 NOT_FOUND` (PATCH/DELETE sản phẩm
không tồn tại hoặc đã xoá mềm trước đó).

> Xoá là **soft delete** (`deletedAt`) — khác categories (hard delete) — vì sản phẩm được `order_items`
> tham chiếu (xem §9 Orders); đơn hàng cũ vẫn hiển thị đúng tên/giá dù sản phẩm đã ngừng bán.

> **Không có `stock`/tồn kho** — hoa tươi làm theo đơn/theo mẫu tại thời điểm đặt, không phải hàng lưu
> kho theo SKU cố định. Ẩn tạm sản phẩm dùng `isActive`, không phải "hết hàng".

---

## 9. Orders 🌸

Giai đoạn **cơ bản** — guest checkout (không cần đăng nhập), thanh toán COD, cửa hàng xác nhận qua điện
thoại. Chưa có thanh toán online/`payments`, chưa có `carts`/`cart_items` ở backend (giỏ hàng lưu phía
client, xem [modules/domain-orders.md](modules/domain-orders.md)).

| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/orders` | — (guest checkout) | Tạo đơn hàng — rate limit 10/15 phút theo IP |
| `GET` | `/api/v1/orders/:id` | — | Tra cứu 1 đơn theo `id` (UUID đóng vai trò token, xem dưới) |
| `GET` | `/api/v1/admin/orders?status=&page=&limit=` | `orders.view_all` | Danh sách đơn (phân trang) |
| `GET` | `/api/v1/admin/orders/:id` | `orders.view_all` | Chi tiết 1 đơn |
| `PATCH` | `/api/v1/admin/orders/:id/status` | `orders.update_status` hoặc `orders.cancel` — xem dưới | Đổi trạng thái đơn |

### `POST /api/v1/orders` (công khai)

```jsonc
{ "items": [{ "productId": "uuid", "quantity": 2 }],
  "recipientName": "Trần Thị B", "recipientPhone": "0900000000",
  "deliveryAddress": "123 Đường Hoa, Q1", "deliveryDate": "2026-12-25",
  "deliveryTimeSlot": "chieu", "note": "Giao trước 17h" }
```

- `recipientName`/`recipientPhone` là **người NHẬN hoa** (có thể khác người đặt) — cũng là số điện
  thoại cửa hàng gọi lại xác nhận, vì giai đoạn này chưa thu thập riêng thông tin người đặt/email.
- `deliveryDate` dạng `YYYY-MM-DD`, phải từ hôm nay trở đi (422 nếu ở quá khứ).
- `deliveryTimeSlot`: `sang` | `chieu` | `toi`.
- Giá/tên sản phẩm được **chốt (snapshot)** vào đơn tại thời điểm đặt — sản phẩm sau đó đổi giá/tên/bị
  ẩn không ảnh hưởng đơn đã tạo.
- `409 PRODUCT_UNAVAILABLE` khi có sản phẩm trong giỏ không còn tồn tại/đã ẩn/đã xoá — giỏ hàng phía
  client (localStorage) có thể đã cũ so với dữ liệu server.
- Đã đăng nhập (cookie `access_token` hợp lệ) thì đơn tự gắn `userId`; không đăng nhập vẫn đặt được
  bình thường (`userId: null`).
- `website` (tuỳ chọn): **honeypot chống bot** — field ẩn bằng CSS ở form thật, người dùng thật không
  bao giờ điền được. Gửi kèm bất kỳ giá trị nào (kể cả chỉ khoảng trắng) → `422 INVALID_SUBMISSION`,
  không tạo đơn. Xem [modules/domain-orders.md](modules/domain-orders.md#9-chống-spam-form-honeypot).

### `GET /api/v1/orders/:id` (công khai)

`id` (UUID) đóng vai trò **token tra cứu** — ai có link đều xem được, không cần đăng nhập/quyền gì,
giống trang xác nhận đơn hàng khách của các nền tảng thương mại điện tử khác. `orderCode` (vd
`HX2609100001`) chỉ để **hiển thị/đọc qua điện thoại**, KHÔNG dùng làm khoá tra cứu — dễ đoán hơn UUID
nên không đủ an toàn để đóng vai trò quyền truy cập (chống IDOR, xem [07 §2](07-bao-mat.md)).
`404 NOT_FOUND` khi `id` không tồn tại.

### `PATCH /api/v1/admin/orders/:id/status`

```jsonc
{ "status": "confirmed" } // 'pending'|'confirmed'|'preparing'|'delivering'|'completed'|'cancelled'
```

Quyền phụ thuộc **giá trị `status` gửi lên** (đúng ma trận [05 §2.4](05-database-va-rbac.md#24-ma-trận-vai-trò--quyền-mặc-định-seed)),
không phải 1 permission cố định cho cả route:

- `status: "cancelled"` → cần `orders.cancel`.
- Mọi giá trị khác → cần `orders.update_status`.

Ràng buộc: `409 ORDER_STATUS_FINAL` khi đơn đã `completed`/`cancelled` (không đổi tiếp được) ·
`409 ORDER_CANNOT_CANCEL` khi huỷ đơn đang `delivering` · `403 FORBIDDEN` khi thiếu đúng permission
cho giá trị `status` đang gửi · `404 NOT_FOUND` khi đơn không tồn tại.

---

## 10. Contact 🔧

| Method | Path | Quyền | Rate limit | Mô tả |
|---|---|---|---|---|
| `POST` | `/api/v1/contact` | — | 5 / 15 phút theo IP | Khách gửi form Liên hệ |
| `GET` | `/api/v1/admin/contact-messages?isHandled=&page=&limit=` | `contact.manage` | — | Danh sách tin nhắn (phân trang) |
| `PATCH` | `/api/v1/admin/contact-messages/:id` | `contact.manage` | — | Đánh dấu đã/chưa xử lý |

### `POST /api/v1/contact` (công khai)

```jsonc
{ "name": "Nguyễn Thị A", "phone": "0912345678", "email": "a@example.com", "message": "Cho hỏi giá bó hoa cưới" }
// 201
{ "success": true, "message": "Đã gửi liên hệ, chúng tôi sẽ phản hồi sớm nhất", "data": { "id": "uuid", "...": "..." } }
```

- `email` tuỳ chọn — bỏ trống hoặc gửi `""` đều được, lưu thành `null`.
- Ghi vào DB **trước**, gửi email thông báo tới `CONTACT_EMAIL` là **best-effort** (lỗi gửi email
  không làm hỏng response — request vẫn 201 vì đã lưu DB xong, giống cách `magic-link`/`reset-password`
  nuốt lỗi gửi mail, xem [07 · Bảo mật §1](07-bao-mat.md)). Nội dung khách nhập được escape HTML trước
  khi chèn vào email (chống XSS trong email nội bộ) — xem [modules/core-contact.md](modules/core-contact.md).
- Rate limit 5 lần/15 phút theo IP — vượt quá trả `429`.

Lỗi: `422` (thiếu `name`/`phone`/`message`, hoặc `email` sai định dạng).

---

## 11. SuperAdmin — Users · `/api/v1/superadmin/users` 🔒 `users.manage`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/?status=&role=&search=&page=&limit=` | Danh sách user (phân trang) |
| `PATCH` | `/:id/block` | Khoá tài khoản |
| `PATCH` | `/:id/unblock` | Mở khoá |
| `DELETE` | `/:id` | Xoá mềm |
| `POST` | `/:id/reset-password` | Sinh mật khẩu mới + gửi email |
| `PATCH` | `/:id/role` | Đổi role |

### Ràng buộc chống leo thang quyền (enforce ở **service**, không chỉ ở UI)

```mermaid
flowchart TD
    REQ([SuperAdmin gọi API]) --> C1{"target === chính mình?"}
    C1 -->|Có| E1["400 CANNOT_TARGET_SELF<br/>(block · unblock · xoá · đổi role)"]
    C1 -->|Không| C2{"Đang gán role<br/>super_admin?"}
    C2 -->|Có| E2["403 CANNOT_GRANT_SUPER_ADMIN"]
    C2 -->|Không| C3{"User tồn tại &<br/>chưa bị xoá?"}
    C3 -->|Không| E3["404 NOT_FOUND"]
    C3 -->|Có| OK["Thực hiện + ghi audit_logs<br/>(before / after)"]

    style E1 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style E2 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style OK fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

> `reset-password` **không** chặn chính mình — SuperAdmin tự reset mật khẩu của mình là hợp lệ.

### `GET /api/v1/superadmin/users`

```jsonc
{ "success": true, "data": [
  { "id": "uuid", "fullName": "...", "email": "...", "status": "active",
    "createdAt": "...", "roles": [{ "role": { "code": "member", "name": "Member" } }] }
], "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }
```

Filter: `status` ∈ `active|blocked` · `role` = role code · `search` tìm trong `fullName`/`email`
(không phân biệt hoa thường). Mặc định `limit=20`, tối đa 100. Không trả user đã xoá mềm.

### `DELETE /api/v1/superadmin/users/:id`

Xoá mềm: đặt `deletedAt`, `status = blocked`, **thu hồi toàn bộ session**, và đổi email thành
`<email>.deleted.<id>` để giải phóng địa chỉ email cho lần đăng ký sau (vì `email` có ràng buộc
`UNIQUE` toàn cục).

### `POST /api/v1/superadmin/users/:id/reset-password`

Sinh mật khẩu ngẫu nhiên, **gửi email trước rồi mới ghi DB** — email lỗi thì mật khẩu cũ còn nguyên,
tránh tình trạng tài khoản bị đặt mật khẩu mà không ai biết. Mật khẩu bản rõ **không** log,
**không** trả về response.

---

## 12. SuperAdmin — Roles · `/api/v1/superadmin/roles` 🔒 `roles.manage`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/` | Danh sách role + permission + số user đang gán |
| `POST` | `/` | Tạo Custom Role (`isSystem = false`) |
| `PATCH` | `/:id` | Sửa tên/mô tả/permission |
| `DELETE` | `/:id` | Xoá Custom Role |

```jsonc
// POST /
{ "code": "accountant", "name": "Kế toán", "description": "...", "permissionIds": [5, 8, 12] }
```

`code` phải khớp `^[a-z][a-z0-9_]*$`.

> 🔐 **Chốt chặn "shadow super_admin"**: mọi permission có `isRestricted = true`
> (`users.manage`, `settings.manage`, `roles.manage`, `permissions.manage`) **luôn bị lọc bỏ** khỏi
> `permissionIds` ở tầng service — kể cả khi client cố tình gửi kèm. Không chỉ ẩn ở UI.

Lỗi: `403 SYSTEM_ROLE_LOCKED` (sửa/xoá System Role) · `409 ROLE_IN_USE` (còn user đang gán).

---

## 13. SuperAdmin — Permissions · `/api/v1/superadmin/permissions` 🔒 `permissions.manage`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/?assignable=true` | Danh sách permission; `assignable=true` loại bỏ permission `isRestricted` |
| `POST` | `/` | Tạo permission mới (`isSystem = false`) |
| `PATCH` | `/:id` | Sửa `code`/`groupName`/`description` |
| `DELETE` | `/:id` | Xoá permission |

```jsonc
{ "code": "products.export", "groupName": "products", "description": "Xuất danh sách sản phẩm" }
```

`code` phải khớp `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$` (dạng `group.action`).

> ⚠️ **Permission tạo qua UI chưa chặn được gì.** Nó chỉ có tác dụng khi developer thêm
> `authorize('code-đó')` vào một route trong code. Đây là bản chất của mô hình permission thực thi
> trong code, không phải giới hạn sửa được bằng UI — UI cần hiển thị rõ cảnh báo này.

Lỗi: `409 PERMISSION_CODE_TAKEN` · `403 SYSTEM_PERMISSION_LOCKED` (đổi `code`/xoá permission
`isSystem`) · `409 PERMISSION_IN_USE` (còn role đang gán).

---

## 14. SuperAdmin — Login Methods · `/api/v1/superadmin/login-methods` 🔒 `settings.manage`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/` | Trạng thái 3 phương thức đăng nhập |
| `PATCH` | `/:method` | Bật/tắt một phương thức |

`:method` ∈ `google_oauth` · `email_password` · `magic_link`. Body: `{ "isEnabled": false }`.

> 🔐 **Luôn phải còn ≥ 1 phương thức bật** sau khi áp thay đổi — chặn ở service, không chỉ ở UI.
> Vi phạm → `400 AT_LEAST_ONE_LOGIN_METHOD_REQUIRED`. Nếu không có chốt này, tắt hết phương thức
> sẽ khoá cứng toàn bộ hệ thống, kể cả super_admin.

---

## 15. SuperAdmin — Audit Logs · `/api/v1/superadmin/audit-logs` 🔒 `audit.view`

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/?actorId=&entityType=&from=&to=&page=&limit=` | Nhật ký thao tác nhạy cảm |

`from`/`to` theo định dạng ISO 8601 (`2026-09-01T00:00:00.000Z`).

```jsonc
{ "success": true, "data": [
  { "id": "uuid", "action": "user.block", "entityType": "user", "entityId": "uuid",
    "before": { "status": "active" }, "after": { "status": "blocked" },
    "ipAddress": "1.2.3.4", "createdAt": "...",
    "actor": { "id": "uuid", "fullName": "Super Admin", "email": "..." } }
], "meta": { "...": "..." } }
```

Danh sách `action` đang ghi: [modules/core-audit-log.md](modules/core-audit-log.md).

---

## 16. Endpoint dự kiến (🌸 Domain — chưa triển khai)

`GET /api/v1/products` (§8) đã triển khai nhưng **đơn giản hơn** bản phác thảo cũ — chỉ có
`categoryId`/`page`/`limit`, CHƯA có `search`/`minPrice`/`maxPrice`/`occasion` (occasions chưa có bảng,
xem [05 §3.4](05-database-va-rbac.md#34-nhóm-sản-phẩm)). `GET /api/v1/products/:slug` đã triển khai
(§8). Orders (§9) đã triển khai **giai đoạn cơ bản** — guest checkout, COD, đổi trạng thái đơn. Còn
thiếu (giai đoạn thanh toán online):

```
POST   /api/v1/payments/webhook/:provider  # verify chữ ký HMAC + idempotency
PATCH  /api/v1/admin/orders/:id/assign-shipper  # orders.assign_shipper — chưa có màn phân công
GET    /api/v1/admin/orders/delivery-queue      # orders.view_delivery_queue (florist)
GET    /api/v1/admin/orders/shipping-queue      # orders.view_shipping_queue (shipper)
```

`GET /api/v1/account/orders` (khách xem đơn của chính mình, `orders.view_own`, row-level check
`orders.user_id = req.user.id`) cũng chưa có — hiện khách xem lại đơn qua link `/don-hang/:id` đã lưu
(không cần đăng nhập), xem [modules/domain-orders.md](modules/domain-orders.md).

Khi triển khai, tuân theo checklist ở [03 · Backend §10](03-backend.md#10-checklist-tạo-module-backend-mới)
và cập nhật lại tài liệu này.

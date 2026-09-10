# 00 · Bắt đầu — chạy dự án trên máy local

Mục tiêu: sau ~30 phút bạn có backend + frontend chạy được, đăng nhập được bằng tài khoản
`super_admin`, và biết chỗ tra cứu khi gặp lỗi.

---

## 1. Yêu cầu môi trường

| Thành phần | Phiên bản tối thiểu | Kiểm tra | Ghi chú |
|---|---|---|---|
| **Node.js** | 20 LTS (khuyến nghị 22) | `node -v` | Next.js 16 yêu cầu Node ≥ 20.9 |
| **npm** | 10 | `npm -v` | Đi kèm Node |
| **PostgreSQL** | 15+ | `psql --version` | Có thể dùng Neon (cloud) thay vì cài local |
| **`pg_dump`** | 15+ | `pg_dump --version` | Chỉ cần khi chạy *backup job* ở production |
| **Git** | 2.40+ | `git --version` | |

> **Không bắt buộc Docker khi dev.** Backend + frontend chạy trực tiếp bằng Node, database dùng Neon
> (*serverless* Postgres, có gói miễn phí). Docker chỉ dùng khi triển khai production —
> xem [10 · Triển khai & vận hành](10-trien-khai-van-hanh.md).

---

## 2. Luồng cài đặt

```mermaid
flowchart TD
    A[git clone] --> B[backend: npm install]
    B --> C[Tạo backend/.env<br/>từ .env.example]
    C --> D{Có DATABASE_URL chưa?}
    D -->|Chưa| D1[Tạo project trên neon.tech<br/>copy connection string]
    D1 --> C
    D -->|Rồi| E[npx prisma migrate dev]
    E --> F[npm run seed:core<br/>npm run seed:domain]
    F --> G[npm run dev<br/>→ localhost:4000]

    G --> H[frontend: npm install]
    H --> I[Tạo frontend/.env.local]
    I --> J[npm run dev<br/>→ localhost:3000]
    J --> K([Đăng nhập bằng<br/>tài khoản super_admin seed sẵn])

    style A fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    style K fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style D fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

---

## 3. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Mở `backend/.env` và điền **tối thiểu 3 biến bắt buộc** (thiếu là server không khởi động được —
cơ chế *fail-fast*, xem `src/config/env.ts`):

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
JWT_ACCESS_SECRET="<chuỗi ngẫu nhiên ≥ 32 ký tự>"
JWT_REFRESH_SECRET="<chuỗi ngẫu nhiên ≥ 32 ký tự, KHÁC access secret>"
```

Sinh secret nhanh:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Ý nghĩa và cách lấy giá trị của **từng biến còn lại** (Cloudinary, email, Google OAuth...):
xem [09 · Môi trường & biến cấu hình](09-moi-truong-va-bien-cau-hinh.md).

Tạo schema + dữ liệu ban đầu:

```bash
npx prisma migrate dev     # tạo bảng theo prisma/schema.prisma
npm run seed:core          # 3 System Role, permission core, super_admin mặc định
npm run seed:domain        # role/permission nghiệp vụ shop hoa + danh mục mẫu
npm run dev                # http://localhost:4000
```

Kiểm tra nhanh:

```bash
curl http://localhost:4000/health
# {"success":true,"data":{"status":"ok"}}
```

### Tài khoản mặc định sau seed

| Biến `.env` | Mặc định |
|---|---|
| `SUPER_ADMIN_EMAIL` | `superadmin@example.com` |
| `SUPER_ADMIN_PASSWORD` | `ChangeMe123!` |

> ⚠️ **Đổi mật khẩu ngay sau lần đăng nhập đầu tiên.** Trên môi trường thật, đặt 2 biến này trong
> `.env` trước khi chạy seed — đừng dùng giá trị mặc định.

---

## 4. Frontend

```bash
cd frontend
npm install
```

Tạo `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=   # chỉ cần khi bật đăng nhập Google
```

```bash
npm run dev     # http://localhost:3000
```

---

## 5. Kiểm chứng đã chạy đúng

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Mở `http://localhost:3000` | Trang chủ storefront ("Hoa Xinh") hiển thị |
| 2 | Vào `/login`, đăng nhập bằng tài khoản super_admin | Chuyển về trang chủ, menu người dùng hiện tên |
| 3 | Vào `/superadmin/users` | Thấy danh sách người dùng, có phân trang |
| 4 | Vào `/account/devices` | Thấy phiên hiện tại, có nhãn "Hiện tại" |
| 5 | Vào `/admin/categories` | Thấy danh mục "Hoa sinh nhật" (từ `domain.seed.ts`) |

---

## 6. Chạy test

```bash
cd backend  && npm test     # unit + integration (không cần database)
cd frontend && npm test     # unit component/hook (không cần backend)
```

Test *end-to-end* (Playwright) cần backend + frontend + database thật đang chạy —
xem [08 · Kiểm thử](08-kiem-thu.md).

---

## 7. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Missing required environment variable: DATABASE_URL` | Chưa tạo `.env` hoặc thiếu biến bắt buộc | Copy lại từ `.env.example`, điền đủ 3 biến ở §3 |
| `Role "member" chưa được seed` khi đăng ký | Chưa chạy seed | `npm run seed:core` |
| Đăng nhập được nhưng vào `/superadmin/*` bị đá về `/403` | Tài khoản không có role `super_admin` | Đăng nhập bằng đúng tài khoản seed, hoặc gán role qua DB |
| `super_admin` bị `403 FORBIDDEN` ở API domain | Chưa chạy `seed:domain` — `super_admin` **không** tự động có mọi permission | `npm run seed:domain` |
| Frontend gọi API bị lỗi CORS | `FRONTEND_URL` ở backend khác origin thật của frontend | Sửa `FRONTEND_URL=http://localhost:3000` trong `backend/.env` |
| Đăng nhập xong bị đăng xuất ngay | Cookie không được gửi kèm | Kiểm tra `NEXT_PUBLIC_API_URL` trỏ đúng backend, và backend đặt `credentials: true` |
| Gửi email (magic link / quên mật khẩu) không tới | Chưa cấu hình SMTP/Resend | Xem bảng `email_logs` (cột `status`, `error`) và [09 · Môi trường](09-moi-truong-va-bien-cau-hinh.md#email) |
| `pg_dump: command not found` | Backup job thiếu binary | Chỉ ảnh hưởng production; cài `postgresql-client` trên máy chạy cron |
| Prisma báo `P1001 Can't reach database server` | Sai `DATABASE_URL` hoặc Neon đang *sleep* | Kiểm tra lại connection string, thêm `?sslmode=require` |

---

## 8. Tiếp theo

Đọc [01 · Tổng quan sản phẩm](01-tong-quan-san-pham.md) để nắm phạm vi, rồi
[02 · Kiến trúc tổng quan](02-kien-truc-tong-quan.md) trước khi viết dòng code đầu tiên.

Trước mỗi lần bắt đầu một hạng mục mới, xem [`CHECKLIST.md`](../CHECKLIST.md) để biết việc gì
đang dở và việc gì là ưu tiên kế tiếp.

# Backend — Express API (TypeScript)

Kiến trúc: **Modular + MVC + Service Layer**. Tài liệu đầy đủ:
[`docs/03-backend.md`](../docs/03-backend.md) · [`docs/05-database-va-rbac.md`](../docs/05-database-va-rbac.md) ·
[`docs/06-api-reference.md`](../docs/06-api-reference.md).

## Cài đặt

```bash
npm install
cp .env.example .env      # điền DATABASE_URL + JWT_ACCESS_SECRET + JWT_REFRESH_SECRET
npx prisma migrate dev
npm run seed:core         # 3 System Role, permission core, tài khoản super_admin
npm run seed:domain       # role/permission shop hoa + danh mục mẫu
npm run dev               # → http://localhost:4000
```

Kiểm tra: `curl http://localhost:4000/health`

Hướng dẫn từng biến `.env` (ý nghĩa, cách lấy giá trị, hệ quả khi sai) nằm **ngay trong
[`.env.example`](.env.example)** và [`docs/09`](../docs/09-moi-truong-va-bien-cau-hinh.md).

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev với hot reload (`tsx watch`) |
| `npm run build` / `npm start` | Build ra `dist/` rồi chạy production |
| `npm run typecheck` | Kiểm tra kiểu cho cả `src/` lẫn `tests/` |
| `npm run lint` | ESLint |
| `npm test` | **334 test** — unit + integration, **không cần database** |
| `npm run test:unit` / `test:integration` / `test:watch` / `test:coverage` | Chạy chọn lọc |
| `npm run prisma:studio` | GUI xem/sửa dữ liệu |
| `npm run seed:core` / `seed:domain` | Nạp dữ liệu ban đầu |

## Cấu trúc

```
src/
├── config/          # 🔧 env (validate + fail-fast) · prisma singleton · r2 client
├── shared/          # 🔧 hạ tầng dùng chung — KHÔNG chứa business logic
│   ├── errors/      #    AppError · ValidationError
│   ├── middleware/  #    asyncHandler · authenticate · authorize · errorHandler · requestId · validate
│   ├── response/    #    ApiResponse: ok() · created() · paginated()
│   ├── logger/      #    logger gắn requestId
│   └── utils/       #    hash · jwt · rbac · slugify
├── modules/
│   ├── core/        # 🔧 auth · users · roles · permissions · settings · files · email · audit-log
│   └── domain/      # 🌸 categories (+ products, orders... sẽ thêm)
├── routes/v1/       # gom router → /api/v1/*
├── types/           # augmentation Express (req.user, req.requestId)
├── jobs/            # 🔧 cron: backup DB (2 ngày/lần) · dọn file mồ côi (10 ngày/lần)
├── app.ts           # đăng ký middleware + route — KHÔNG gọi listen() (để test được)
└── server.ts        # entrypoint: listen + graceful shutdown + đăng ký cron
```

> **Lưu ý**: thư mục hạ tầng là **`src/shared/`** (từng tên `src/core/`, đã đổi để không nhầm với
> `src/modules/core/` — hai khái niệm khác nhau: `shared/` là hạ tầng kỹ thuật, `modules/core/` là
> nhóm module nghiệp-vụ-trung-lập).

## Tài khoản sau seed

Email/mật khẩu lấy từ `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` trong `.env`
(mặc định `superadmin@example.com` / `ChangeMe123!`) — **đổi ngay sau lần đăng nhập đầu**.

## Thêm module mới

Checklist đầy đủ: [`docs/03-backend.md §10`](../docs/03-backend.md#10-checklist-tạo-module-backend-mới).

Tóm tắt: tạo `modules/<core|domain>/<tên>/` với `*.routes.ts → *.controller.ts → *.service.ts →
*.validation.ts`; validate bằng zod; controller bọc `asyncHandler`; lỗi nghiệp vụ dùng `AppError`;
response qua `ApiResponse`; route cần quyền thì `authorize('code')` **và** thêm permission vào seed;
mount router trong `routes/v1/index.ts`; viết test; cập nhật tài liệu.

Module [`domain/categories`](src/modules/domain/categories/) là **mẫu tham chiếu** —
xem [`docs/modules/domain-categories.md`](../docs/modules/domain-categories.md).

## Lưu ý triển khai thật

| Hạng mục | Lưu ý |
|---|---|
| **Google OAuth** | Cần `GOOGLE_CLIENT_ID` **giống hệt** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` bên frontend. Backend verify ID token, không dùng luồng redirect |
| **Cloudinary** | Cần đủ 3 biến `CLOUDINARY_*`. Tách tài khoản/folder theo môi trường — dùng chung là công thức để job dọn file ở dev xoá mất ảnh production |
| **Email** | Mặc định `EMAIL_PROVIDER=smtp`. Đổi sang `resend` khi đã có domain verify DKIM/SPF |
| **Backup DB** | Job gọi binary `pg_dump` — phải có sẵn trong PATH của môi trường chạy cron |
| **Cron** | Chỉ đăng ký khi `NODE_ENV=production` (xem `server.ts`) |
| **Reverse proxy** | Cần `app.set('trust proxy', 1)` — hiện **chưa có**, xem `BE-02` ở [`docs/12`](../docs/12-danh-gia-va-de-xuat.md) |

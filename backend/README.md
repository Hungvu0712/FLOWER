# Backend — Express API (TypeScript, Core + Domain)

Xem chuẩn kiến trúc đầy đủ ở [ARCHITECTURE.md](../ARCHITECTURE.md), schema & RBAC ở [DATABASE.md](../DATABASE.md), bảo mật ở [SECURITY.md](../SECURITY.md).

## Cài đặt

```bash
npm install
cp .env.example .env   # điền DATABASE_URL (Neon), JWT secrets, R2, Resend/SMTP...
npx prisma migrate dev --name init
npm run seed:core      # 3 System Role, permission core, super_admin mặc định
npm run seed:domain    # role/permission domain shop hoa (sales_staff, florist, shipper...)
npm run dev
```

Server chạy ở `http://localhost:4000`, API mount dưới `/api/v1` (xem ARCHITECTURE.md §5). Kiểm tra
nhanh: `GET /health` (ngoài versioning).

## Cấu trúc

```
src/
├── core/            # hạ tầng dùng chung — errors, middleware, response, logger, utils
├── config/          # env (validate + fail-fast), prisma client, r2 client
├── modules/
│   ├── core/        # auth, users, roles, permissions, settings, files, email, audit-log
│   └── domain/      # products, orders... — hiện là thư mục trống, viết dần theo README.md gốc
├── routes/v1/       # gom router từng module thành /api/v1/*
├── jobs/            # cron: backup DB (2 ngày/lần), dọn file mồ côi (10 ngày/lần)
├── app.ts           # đăng ký middleware + route, KHÔNG gọi listen() (dễ test)
└── server.ts        # entrypoint — listen + graceful shutdown + đăng ký cron
```

## Tài khoản mặc định sau seed

- Email: giá trị `SUPER_ADMIN_EMAIL` trong `.env` (mặc định `superadmin@example.com`)
- Mật khẩu: giá trị `SUPER_ADMIN_PASSWORD` trong `.env` (mặc định `ChangeMe123!`) — **đổi ngay sau khi đăng nhập lần đầu**.

## Thêm module domain mới

Xem checklist ở [ARCHITECTURE.md §18](../ARCHITECTURE.md#18-checklist-khi-tạo-module-backend-mới). Tóm tắt: tạo
`modules/domain/<tên>/` với `*.routes.ts → *.controller.ts → *.service.ts`, validate bằng `zod`, bọc
controller bằng `asyncHandler`, throw `AppError` cho lỗi nghiệp vụ, trả response qua `core/response`,
thêm permission mới vào `prisma/seed/domain.seed.ts` nếu route cần quyền, rồi mount router trong
`src/routes/v1/index.ts`.

## Lưu ý triển khai thật

- **Google OAuth**: cần `GOOGLE_CLIENT_ID`; backend verify ID token do frontend lấy qua Google Identity
  Services (không dùng luồng redirect passport truyền thống).
- **R2**: cần `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- **Email**: mặc định `EMAIL_PROVIDER=smtp` (không cần domain riêng, dễ vào spam hơn); đổi sang
  `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` khi đã verify domain — xem [ARCHITECTURE.md §9](../ARCHITECTURE.md#9-email).
- **Backup DB**: job `backupDatabase.job.ts` gọi binary `pg_dump` — cần cài đặt sẵn trên máy chạy cron
  (VPS/Docker image production); không chạy được nếu thiếu binary này trong PATH.
- Cron chỉ đăng ký khi `NODE_ENV=production` (xem `server.ts`) — lúc dev sẽ không tự chạy backup/dọn file.

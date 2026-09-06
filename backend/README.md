# Backend — Express API (Core + Domain)

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

Server chạy ở `http://localhost:4000` (đổi qua `PORT` trong `.env`). Kiểm tra nhanh: `GET /health`.

## Cấu trúc

```
src/
├── modules/
│   ├── core/       # auth, users, roles, permissions, files, email, audit-log — xem ARCHITECTURE.md §2
│   └── domain/     # products, orders... — hiện là thư mục trống, viết dần theo README.md gốc
├── middlewares/    # authenticate, authorize, errorHandler, asyncHandler, validate
├── config/         # env, prisma client, r2 client
├── lib/            # AppError, logger, hash, jwt, rbac
├── jobs/           # cron: backup DB (2 ngày/lần), dọn file mồ côi (10 ngày/lần)
├── app.js          # đăng ký middleware + route, KHÔNG listen ở đây (để test dễ import app)
└── server.js       # entrypoint — listen + đăng ký cron (chỉ ở production)
```

## Tài khoản mặc định sau seed

- Email: giá trị `SUPER_ADMIN_EMAIL` trong `.env` (mặc định `superadmin@example.com`)
- Mật khẩu: giá trị `SUPER_ADMIN_PASSWORD` trong `.env` (mặc định `ChangeMe123!`) — **đổi ngay sau khi đăng nhập lần đầu**.

## Thêm module domain mới

Xem checklist ở [ARCHITECTURE.md §9](../ARCHITECTURE.md#9-checklist-khi-tạo-module-backend-mới). Tóm tắt: tạo
`modules/domain/<tên>/` với `routes → controller → service`, validate bằng `zod`, bọc controller bằng
`asyncHandler`, throw `AppError` cho lỗi nghiệp vụ, thêm permission mới vào `prisma/seed/domain.seed.js` nếu
route cần quyền, rồi mount router trong `app.js`.

## Lưu ý triển khai thật

- **Google OAuth**: cần `GOOGLE_CLIENT_ID`; backend verify ID token do frontend lấy qua Google Identity
  Services (không dùng luồng redirect passport truyền thống).
- **R2**: cần `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`.
- **Email**: mặc định `EMAIL_PROVIDER=smtp` (không cần domain riêng, dễ vào spam hơn); đổi sang
  `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` khi đã verify domain — xem [ARCHITECTURE.md §6](../ARCHITECTURE.md#6-email-service).
- **Backup DB**: job `backupDatabase.job.js` gọi binary `pg_dump` — cần cài đặt sẵn trên máy chạy cron
  (VPS/Docker image production); không chạy được nếu thiếu binary này trong PATH.
- Cron chỉ đăng ký khi `NODE_ENV=production` (xem `server.js`) — lúc dev sẽ không tự chạy backup/dọn file.

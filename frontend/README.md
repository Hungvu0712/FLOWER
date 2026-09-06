# Frontend — Next.js (Core + Domain)

Xem chuẩn kiến trúc đầy đủ ở [ARCHITECTURE.md](../ARCHITECTURE.md), schema & RBAC ở [DATABASE.md](../DATABASE.md).

## Cài đặt

```bash
npm install
cp .env.local.example .env.local   # điền NEXT_PUBLIC_API_URL (mặc định http://localhost:4000)
npm run dev
```

Chạy song song `backend/` (xem [backend/README.md](../backend/README.md)) — frontend gọi API qua `NEXT_PUBLIC_API_URL`.

## Đã triển khai (core)

- **Auth**: `/login`, `/register`, `/magic-link` (+ `/magic-link/verify`), `/forgot-password`, `/reset-password`.
  Nút Google OAuth có sẵn UI nhưng cần cấu hình `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + tích hợp Google Identity
  Services để lấy `idToken` gửi lên `POST /api/auth/google` (chưa nối dây thật trong bản này).
- **Account self-service**: `/account/profile` (đổi họ tên/SĐT/avatar — avatar upload qua R2 presigned URL),
  `/account/devices` (danh sách thiết bị, đăng xuất từng thiết bị/tất cả thiết bị khác), đổi mật khẩu.
- **SuperAdmin**: `/superadmin/users` (danh sách, khoá/mở khoá, reset password, xoá — tự chặn thao tác lên
  chính mình ở UI, backend chặn cứng), `/superadmin/login-methods` (bật/tắt phương thức đăng nhập, tự chặn
  tắt phương thức cuối cùng).
- `proxy.ts` (quy ước Next.js 16, đổi tên từ `middleware.ts`) bảo vệ `/account/*`, `/admin/*`, `/superadmin/*`.

## Chưa triển khai / việc tiếp theo

- `/superadmin/roles`, `/superadmin/permissions` — API backend đã có đủ (`roles.service.js`,
  `permissions.service.js`), UI chưa viết. Theo cùng pattern với `admin-users`/`admin-login-methods`.
- Toàn bộ **domain** (storefront, `/admin/products`, `/admin/orders`...) — xem `features/domain/README.md`.
- Nối Google Identity Services thật cho nút "Đăng nhập với Google".

## Cấu trúc

```
src/
├── app/            # routes — xem ARCHITECTURE.md §8.1
├── components/ui/  # Button, FormField dùng chung (Tailwind, không dùng UI kit dựng sẵn)
├── features/
│   ├── core/       # mỗi feature = *.service.ts (axios thuần) + *.hooks.ts (TanStack Query)
│   └── domain/     # trống — viết theo nghiệp vụ dự án
├── lib/            # axios instance (withCredentials, auto-refresh khi 401), decode JWT (không verify)
├── store/          # Zustand — useAuthStore (chỉ lưu user hiện tại cho UI, không cache server data)
└── proxy.ts         # bảo vệ route ở edge/node runtime trước khi vào app/
```

## Lưu ý

- Toàn bộ session qua cookie httpOnly (`access_token`, `refresh_token`) do backend set — frontend
  không tự tay lưu token vào localStorage/state, `axios` instance dùng `withCredentials: true`.
- `lib/jwt.ts` chỉ **decode** (không verify chữ ký) để tối ưu UX (ẩn/hiện menu, redirect sớm ở
  `proxy.ts`) — mọi quyết định bảo mật thật sự nằm ở backend (`authenticate` + `authorize`), xem
  [SECURITY.md §2](../SECURITY.md).

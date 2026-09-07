# Frontend — Next.js (Core + Domain)

Xem chuẩn kiến trúc đầy đủ ở [ARCHITECTURE.md](../ARCHITECTURE.md), schema & RBAC ở [DATABASE.md](../DATABASE.md).

## Cài đặt

```bash
npm install
cp .env.local.example .env.local   # điền NEXT_PUBLIC_API_URL (mặc định http://localhost:4000)
npm run dev
```

Chạy song song `backend/` (xem [backend/README.md](../backend/README.md)) — frontend gọi API qua `NEXT_PUBLIC_API_URL` + prefix `/api/v1`.

## Design system

"Soft Petal" — token định nghĩa ở `src/app/globals.css` (`@theme`), font qua `next/font/google`
(Cormorant Garamond cho tiêu đề, DM Sans cho nội dung) trong `src/app/layout.tsx`. Đổi màu/font ở
đúng 1 chỗ này sẽ áp dụng cho toàn app vì mọi component dùng token (`bg-rose`, `text-ink`, `font-display`...),
không hard-code màu riêng lẻ.

## Đã triển khai (core)

- **Auth**: `/login`, `/register`, `/magic-link` (+ `/magic-link/verify`), `/forgot-password`, `/reset-password`.
- **Account self-service**: `/account/profile` (đổi họ tên/SĐT/avatar qua R2 presigned URL), `/account/devices`
  (danh sách thiết bị, đăng xuất từng thiết bị/tất cả thiết bị khác), đổi mật khẩu.
- **SuperAdmin**: `/superadmin/users`, `/superadmin/login-methods`.
- **Storefront**: `/` — trang chủ theo design Soft Petal (hero, danh mục, sản phẩm nổi bật — dữ liệu mẫu,
  chưa nối API domain thật).
- `proxy.ts` bảo vệ `/account/*`, `/admin/*`, `/superadmin/*`.

## Chưa triển khai

- `/superadmin/roles`, `/superadmin/permissions` (API backend đã có, UI chưa viết).
- Google OAuth thật (cần `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + tích hợp Google Identity Services).
- Toàn bộ domain thật: `/products`, `/cart`, `/orders`... (xem `features/domain/README.md`).

## Cấu trúc

```
src/
├── app/            # routes — xem ARCHITECTURE.md §14.2
│   └── (storefront)/_components/   # Nav, Footer dùng chung cho các trang storefront
├── components/ui/  # Button, FormField, FlowerIcon — dùng chung, style theo design token
├── features/
│   ├── core/       # mỗi feature = *.service.ts (axios thuần) + *.hooks.ts (TanStack Query)
│   └── domain/     # trống — viết theo nghiệp vụ dự án
├── lib/            # axios instance (withCredentials, auto-refresh khi 401), decode JWT (không verify)
├── store/          # Zustand — useAuthStore (chỉ lưu user hiện tại cho UI)
└── proxy.ts         # bảo vệ route ở edge/node runtime trước khi vào app/
```

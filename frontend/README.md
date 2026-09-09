# Frontend — Next.js 16 (App Router)

Tài liệu đầy đủ: [`docs/04-frontend.md`](../docs/04-frontend.md).

> ⚠️ **Next.js 16 có breaking changes** so với v14/v15 — đáng chú ý nhất: `middleware.ts` đổi tên
> thành **`proxy.ts`** và export hàm `proxy`. Khi không chắc về API, đọc tài liệu đi kèm trong
> `node_modules/next/dist/docs/` thay vì suy đoán.

## Cài đặt

```bash
npm install
cp .env.local.example .env.local   # điền NEXT_PUBLIC_API_URL
npm run dev                        # → http://localhost:3000
```

Chạy song song với [`backend/`](../backend/README.md). Frontend gọi
`NEXT_PUBLIC_API_URL` + prefix `/api/v1` — **không** thêm `/api/v1` vào biến môi trường.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` / `build` / `start` | Chạy dev · build · chạy production |
| `npm run typecheck` | Kiểm tra kiểu *(cần chạy `next build` ít nhất một lần để sinh type của App Router)* |
| `npm run lint` | ESLint |
| `npm test` | **101 test** — unit + component + hook |
| `npm run test:e2e` | Playwright — **cần backend + database thật đang chạy** |
| `npm run test:e2e:ui` | Playwright chế độ giao diện, debug từng bước |

## Cấu trúc

```
src/
├── app/                    # App Router
│   ├── (storefront)/       # 🌸 PUBLIC — trang chủ, sản phẩm
│   ├── (auth)/             # 🔧 PUBLIC — login · register · magic-link · forgot/reset password
│   ├── (dashboard)/        # 🔧 route group gộp /admin + /superadmin dưới 1 layout
│   ├── account/            # 🔧 PROTECTED — route THẬT (không phải route group) để proxy.ts match
│   └── 403/                #    đích redirect khi đã đăng nhập nhưng thiếu quyền
├── components/             # ui/ · layout/ · shell/ · admin/ · account/
├── features/
│   ├── core/               # 🔧 auth · account · files · admin-users/roles/permissions/login-methods
│   └── domain/             # 🌸 categories
├── lib/                    # 🔧 axios (auto-refresh khi 401) · jwt decode · errors · redirect
├── store/                  # 🔧 zustand — CHỈ UI state
└── proxy.ts                # 🔧 chặn route sớm (Next.js 16)
tests/                      # unit + component
e2e/                        # Playwright
```

**Mỗi feature = 2 file**: `*.service.ts` (axios thuần, không import React) +
`*.hooks.ts` (TanStack Query). Component **không tự gọi axios**.

## Bảo vệ route — 3 lớp, chỉ 1 lớp là bảo mật thật

| Lớp | Ở đâu | Kiểm tra | Bảo mật thật? |
|:---:|---|---|:---:|
| 1 | `src/proxy.ts` | **Chỉ** "đã đăng nhập chưa" (decode JWT lấy `exp`, không verify chữ ký) | ❌ UX |
| 2 | `components/admin/AdminShell.tsx` | Role, qua `useMe()` refetch mỗi lần đổi route | ❌ UX |
| 3 | Backend `authorize()` | Permission hiện tại trong DB | ✅ |

Chi tiết và lý do: [`docs/04-frontend.md §3`](../docs/04-frontend.md).

## Design system "Soft Petal"

Token màu/font khai báo **một chỗ** ở `src/app/globals.css` (`@theme` của Tailwind 4);
font qua `next/font/google` trong `app/layout.tsx` (Cormorant Garamond cho tiêu đề, DM Sans cho nội
dung). Component dùng token (`bg-rose`, `text-ink`, `font-display`) — **không hard-code mã màu**,
đổi bảng màu ở một chỗ là áp dụng toàn app.

Bản thiết kế gốc ở [`.design/`](../.design/) — tài liệu tham chiếu, không phải code chạy.

## Đã triển khai

- **Auth**: `/login` · `/register` · `/magic-link` (+ `/verify`) · `/forgot-password` · `/reset-password`
- **Tài khoản**: `/account/profile` (đổi tên/SĐT/avatar qua R2) · `/account/devices` (quản lý thiết bị)
- **SuperAdmin**: `/superadmin/users` · `/roles` · `/permissions` · `/login-methods`
- **Admin**: `/admin` · `/admin/categories`
- **Storefront**: `/` (giao diện xong, dữ liệu mẫu)

## Chưa triển khai

Trang sản phẩm · giỏ hàng · thanh toán · đơn hàng · màn tra cứu audit log · màn quản lý tài nguyên.
Google OAuth cần `NEXT_PUBLIC_GOOGLE_CLIENT_ID` thật. Xem [`CHECKLIST.md`](../CHECKLIST.md).

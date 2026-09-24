# 04 · Frontend — hiện trạng so với chuẩn (nhánh B · Next.js App Router)

> Mốc review: commit `bdf8d99`. Chuẩn đối chiếu: `frontend-standard.md` (phần chung + nhánh B).
> Mã vấn đề: [02](02-VAN-DE-VA-RUI-RO.md).

## 1. Bảng đối chiếu

| Tiêu chí chuẩn | Hiện trạng | Đánh giá |
|---|---|---|
| Route group `(client)/(admin)/(auth)` | `(storefront)`, `(dashboard)/{admin,superadmin}`, `(auth)`, `account` | ✅ |
| Root layout là Server Component | `app/layout.tsx` không có `'use client'`, bọc `Providers` (client) | ✅ |
| Dữ liệu SEO lấy ở Server Component | Storefront (trang chủ, danh mục, sản phẩm, dịp lễ, blog, đơn) fetch qua `lib/storefront-api.ts` + `generateMetadata` | ✅ Tốt |
| Chặn route theo phiên | `proxy.ts` (đúng quy ước Next 16) | 🟡 Chỉ dựa vào cookie 5 phút (ARCH-03); còn log DEBUG (CODE-01) |
| `loading/error/not-found` | Root có `error`, `global-error`, `not-found`; `(storefront)/loading.tsx` + 2 segment | 🟡 Không có ở `(dashboard)`, `account`; loading storefront dùng một khuôn cho mọi segment (FE-11) |
| Tầng gọi API duy nhất | `lib/axios.ts` (`withCredentials`, interceptor refresh); component **không** gọi axios | ✅ Tầng tách đúng — nhưng interceptor hỏng nhánh lỗi (ERR-01) |
| Mỗi endpoint một hook trong feature | `features/<core\|domain>/<x>/<x>.service.ts` + `<x>.hooks.ts` | ✅ Nhất quán ở 25 feature |
| Phân vai state | TanStack Query cho server state; Zustand chỉ cart/toast/confirm; `useAuthStore` trùng lặp đã được xoá (docs/12 FE-02) | ✅ Đúng tinh thần — nhưng **không dọn server state khi phiên chết** (FE-01) |
| Query key factory | 61 literal trong 25 file | 🟡 `[CHUẨN]` (FE-07) |
| Invalidate sau mutation | Đa số có; nhiều phụ thuộc chéo bị bỏ sót | 🟡 FE-06 |
| Trạng thái giao diện loading/empty/error/toast | Loading và toast đầy đủ; **không có error state** ở mọi danh sách | 🟡 FE-04 |
| Page mỏng | Storefront mỏng; **admin dày** (products 550 dòng, categories 512...) | 🟡 FE-03 |
| Types tập trung | Mỗi service tự khai báo; `PaginationMeta` ×10 | 🟡 `[CHUẨN]` (FE-05) |
| Form RHF + zod | 7 form | 🟡 `[CHUẨN]` (VAL-03) |
| Semantic HTML / a11y | `next/link` ở mọi điều hướng nội bộ, `next/image` + `alt` đầy đủ, `FormField` gắn `htmlFor` | 🟡 Nhưng khoảng 76 label không gắn control, dialog/toast thiếu ARIA (FE-08) |
| Design token | Token trong `globals.css`, chart dùng `var(--color-…)` | 🟡 Thiếu token danger/warning/success nên 48 class `red-*`/`amber-*` (FE-10) |
| Không có secret trong `NEXT_PUBLIC_*` | Chỉ có `API_URL` và `GOOGLE_CLIENT_ID` | ✅ |
| Token không nằm ở localStorage | Cookie `httpOnly`, localStorage chỉ dùng cho giỏ hàng | ✅ |

## 2. Điểm mạnh nên giữ nguyên

- **Kỷ luật phân tầng**: grep toàn `src` không thấy component nào import `@/lib/axios` hay tự
  `fetch`. `fetch` duy nhất nằm ở `lib/storefront-api.ts:46`, dành cho Server Component.
- **Zero `any`**: không có `: any`, `as any`, `@ts-ignore` trong `src`.
- **Storefront đúng kiểu Next.js**: Server Component, `generateMetadata` động, `notFound()`,
  `next/image` với whitelist Cloudinary. `ProductReviews` còn có comment xử lý hydration mismatch.
- **Hook che giấu React Query**: page không biết `queryKey`; toast và lỗi mutation nằm trong hook.
- **Zustand dùng đúng chỗ**: cờ `hasHydrated` chặn redirect nhầm khi giỏ hàng chưa hydrate
  (`useCartStore.ts:32-38`).

## 3. Vấn đề chính (tóm tắt — chi tiết ở 02)

| Mã | Mức | Tóm tắt |
|---|---|---|
| FE-01 | **High** | Cache `me` giữ user cũ khi phiên chết, header vẫn hiện tên; AdminShell mở cổng bằng role cũ |
| FE-02 | **High** | Quay lại sau đăng nhập sai đích / kẹt ở `/login` (3 nguyên nhân) |
| ERR-01 | **High** | Interceptor bỏ rơi request xếp hàng (tính ở nhóm Validation & lỗi) |
| ARCH-03 | Medium | Proxy chỉ dựa vào access cookie 5 phút |
| FE-03 | Medium | 9 trang CRUD copy-paste, form tạo/sửa nhân đôi |
| FE-04 | Medium | Không hiển thị lỗi query |
| FE-05 | Medium `[CHUẨN]` | Types trùng lặp |
| FE-06 | Medium | Thiếu invalidate chéo |
| FE-08 | Medium | a11y: label, dialog, toast |
| FE-09 | Medium | Huỷ đơn / khoá user không hỏi xác nhận |
| FE-07, FE-10, FE-11 | Low | Query key, màu hard-code, hiệu năng (three.js, debounce, phân trang) |

## 4. Cây thư mục đích (điều chỉnh theo feature thật)

Giữ quy ước `<x>.service.ts` + `<x>.hooks.ts` hiện có; chuẩn khoá học gọi là `api/` + `hooks/`, khác
tên nhưng cùng ý. Bổ sung `components/`, `schemas`, `types`, `keys` **bên trong feature** để trang
admin mỏng lại. **➕** là phần cần thêm.

```text
frontend/src/
├── app/
│   ├── layout.tsx                         # + metadata title.template, metadataBase
│   ├── providers.tsx                      # + SessionExpiredHandler (FE-01)
│   ├── (auth)/login/page.tsx              # <Suspense> + useSearchParams, chỉ điều hướng khi /me mới (FE-02)
│   ├── (dashboard)/
│   │   ├── error.tsx  loading.tsx         # ➕ (FE-04)
│   │   └── admin/products/page.tsx        # chỉ ghép ProductForm + ProductList (FE-03)
│   ├── (storefront)/  account/
│   └── error.tsx  global-error.tsx  not-found.tsx
├── features/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts  auth.hooks.ts  auth.schemas.ts
│   │   │   └── auth.keys.ts               # ➕ (FE-07)
│   │   └── account/  admin-roles/  admin-users/  files/ ...
│   └── domain/
│       ├── products/
│       │   ├── products.service.ts  products.hooks.ts
│       │   ├── products.keys.ts           # ➕ productKeys.all/list/detail
│       │   ├── products.schemas.ts        # ➕ zod cho ProductForm (VAL-03)
│       │   ├── products.types.ts          # ➕ Product, ProductVariant... (FE-05)
│       │   └── components/
│       │       ├── ProductForm.tsx        # ↪ từ admin/products/page.tsx:106-336
│       │       └── ProductRow.tsx
│       ├── orders/
│       │   ├── orders.constants.ts        # ➕ STATUS_TONE, NEXT_STATUS, TIME_SLOT_ORDER (đang lặp 2–3 lần)
│       │   ├── orders.schemas.ts          # ➕ form checkout (VAL-03)
│       │   └── components/OrderCard.tsx   # ↪ dùng chung cho orders + delivery-queue
│       └── categories/ blog/ coupons/ occasions/ ...   # cùng khuôn với products
├── components/
│   ├── ui/
│   │   ├── Button.tsx  FormField.tsx  Switch.tsx
│   │   ├── Input.tsx  Select.tsx          # ➕ gom 60 chuỗi class input (FE-03)
│   │   ├── QueryState.tsx                 # ➕ loading / error + thử lại / empty (FE-04)
│   │   ├── Pagination.tsx                 # ➕ đang lặp ở 3 trang
│   │   └── ConfirmDialog.tsx  Toaster.tsx # + role="dialog"/aria-modal, aria-live (FE-08)
│   └── layout/  admin/  shell/  storefront/
├── lib/
│   ├── axios.ts                           # hàng đợi {retry, fail} + onSessionExpired (ERR-01)
│   ├── auth-routes.ts                     # ➕ danh sách route cần đăng nhập dùng chung với proxy
│   ├── date.ts                            # + formatDateTime, todayIso (đang lặp 3–5 lần)
│   └── errors.ts                          # + getFieldErrors (thay 2 chỗ import AxiosError trong UI)
├── types/
│   └── api.ts                             # ➕ ApiResponse<T>, Paginated<T>, PaginationMeta (FE-05)
├── store/                                 # cart (+version/migrate), confirm, toast
└── proxy.ts                               # bỏ log DEBUG (CODE-01)
```

## 5. Lộ trình chuyển đổi frontend

1. **Sửa lỗi phiên** (FE-01, FE-02, ERR-01), kèm test (TEST-01). Việc này độc lập với việc tái cấu trúc.
2. **`QueryState` + `confirmDialog`** cho mọi trang danh sách và thao tác phá huỷ (FE-04, FE-09).
   Thay đổi nhỏ, lợi ích lớn.
3. **Tách form theo feature**, bắt đầu từ `products` (trang lớn nhất), rồi categories, blog. Chỉ viết
   hook chung `useCrudPage` sau khi đã tách xong 3 trang (rule-of-three).
4. **Types + key factory** theo từng feature khi động vào feature đó, không làm một lần cho tất cả.
5. **Form RHF + zod** bắt đầu từ checkout (VAL-03), kết hợp sửa label/a11y (FE-08).

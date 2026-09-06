# 🏗️ Kiến trúc & Quy ước dự án

Tài liệu này là chuẩn kỹ thuật chung áp dụng cho toàn bộ dự án (không riêng nghiệp vụ hoa) — kiến trúc backend, stack frontend, package quy ước, và cấu trúc routing. Đọc cùng [README.md](README.md) (chức năng), [DATABASE.md](DATABASE.md) (schema & RBAC), [SECURITY.md](SECURITY.md) (bảo mật).

---

## 1. Nguyên tắc chung

- **KISS** (Keep It Simple, Stupid): không thiết kế thừa cho tình huống chưa xảy ra; giải pháp đơn giản nhất giải quyết đúng vấn đề hiện tại.
- **DRY** (Don't Repeat Yourself): logic lặp lại (validate, format response, gọi API, xử lý lỗi) phải được bóc thành helper/hook/middleware dùng chung.
- Ưu tiên convention rõ ràng, nhất quán giữa các module hơn là tối ưu tiểu tiết từng chỗ.

---

## 2. Kiến trúc Backend (Node.js + Express)

### 2.1. Modular kết hợp MVC

Mỗi domain nghiệp vụ là 1 **module** độc lập, bên trong module tổ chức theo MVC (Route → Controller → Service → Model/Repository):

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js     # nhận request, gọi service, trả response
│   │   │   ├── auth.service.js        # business logic (không biết gì về req/res)
│   │   │   ├── auth.validation.js     # zod schema cho input
│   │   │   └── auth.repository.js     # truy vấn Prisma (tách khỏi service để dễ test/mock)
│   │   ├── users/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── files/                     # quản lý file/ảnh qua R2
│   │   └── ...
│   ├── middlewares/
│   │   ├── authenticate.js            # verify JWT/cookie session
│   │   ├── authorize.js               # kiểm tra permission/role
│   │   ├── errorHandler.js            # centralized error handler (cuối middleware chain)
│   │   ├── asyncHandler.js            # bọc async controller, tự next(err)
│   │   └── validate.js                # middleware chạy zod schema
│   ├── config/                        # env, prisma client, r2 client, resend client
│   ├── lib/                           # AppError, logger, helpers dùng chung toàn app
│   ├── jobs/                          # cron: backup DB, xoá file mồ côi, xoá backup cũ
│   └── app.js
```

- **Route** chỉ khai báo path + middleware + gọi controller, không chứa logic.
- **Controller** mỏng: parse input đã validate, gọi service, format response chuẩn, không chứa business logic hay query DB trực tiếp.
- **Service** chứa toàn bộ business logic, không phụ thuộc Express (`req`/`res`) → dễ test đơn vị, dễ tái sử dụng (vd gọi từ cron job).
- **Repository** (khi cần) tách các lời gọi Prisma phức tạp ra khỏi service, tránh service phình to — áp dụng khi query nhiều nơi dùng lại, không bắt buộc cho query đơn giản (giữ KISS).

### 2.2. Error handling sạch sẽ

Một class lỗi chuẩn + một error handler duy nhất, không try/catch rải rác khắp controller:

```js
// lib/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // lỗi nghiệp vụ đã lường trước, khác lỗi hệ thống
  }
}
module.exports = AppError;

// middlewares/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;

// middlewares/errorHandler.js — đăng ký CUỐI CÙNG trong app.js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  if (!err.isOperational) logger.error(err); // lỗi lạ (bug) mới log full stack, cảnh báo
  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại',
    code: err.code || 'INTERNAL_ERROR',
  });
}
```

```js
// modules/orders/orders.controller.js
const getOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.getById(req.params.id, req.user);
  res.json({ success: true, data: order });
});
```

Trong service, throw `AppError` thay vì return null/false mập mờ:
```js
if (order.userId !== user.id && !user.permissions.includes('orders.view_all')) {
  throw new AppError('Không có quyền xem đơn hàng này', 403, 'FORBIDDEN');
}
```

Nguyên tắc: **không bao giờ để Promise reject không bắt** (mọi controller async đều bọc `asyncHandler`), **không throw string**, **không nuốt lỗi bằng catch rỗng**.

### 2.3. Response chuẩn

```json
{ "success": true, "data": {...}, "message": "..." }
{ "success": false, "message": "...", "code": "VALIDATION_ERROR" }
```

---

## 3. Hạ tầng & Môi trường

| Môi trường | Database | File storage | Ghi chú |
|---|---|---|---|
| Development | **Neon Postgres** (serverless, free tier) | Cloudflare R2 (bucket dev/staging) | Không cần tự quản lý DB server lúc dev |
| Production (khi scale lớn) | PostgreSQL tự quản lý trên **VPS**, chạy qua **Docker** | Cloudflare R2 (bucket production) | Chuyển khi Neon free tier không đủ (giới hạn compute/storage) |

- **Backup production**: định kỳ **2 ngày/lần**, đẩy file backup (`pg_dump`) lên Cloudflare R2 (bucket riêng `backups/`), **tự động xoá file backup cũ hơn 1 tháng** (lifecycle rule của R2 hoặc cron job dọn dẹp — xem [SECURITY.md §5](SECURITY.md)).
- Prisma migration chạy giống nhau ở cả 2 môi trường nhờ cùng schema — chỉ khác `DATABASE_URL` trong `.env`.
- Container hoá ở production: `docker-compose.yml` gồm service `backend` (Node/Express) + `postgres` (nếu không dùng Neon nữa) + reverse proxy (nginx/caddy) cho HTTPS.

---

## 4. Lưu trữ file & ảnh (Cloudflare R2)

- Toàn bộ ảnh sản phẩm, avatar, file đính kèm blog... lưu trên **Cloudflare R2** (S3-compatible, free tier hào phóng, không phí egress).
- Upload qua **presigned URL** (backend cấp URL tạm, frontend upload thẳng lên R2) để không tốn băng thông qua server Express.
- Bucket **private**, truy cập ảnh qua URL public tĩnh (custom domain trỏ tới R2) hoặc signed URL nếu cần giới hạn thời gian truy cập.
- Schema quản lý file (đánh dấu tái sử dụng, phát hiện file mồ côi) — xem [DATABASE.md §3.7](DATABASE.md).

---

## 5. Email service

| Phương án | Khi dùng | Điều kiện | Nhược điểm |
|---|---|---|---|
| **Resend** (khuyến nghị, production) | Đã có domain riêng | Bắt buộc **xác minh domain** (cấu hình DKIM/SPF/DMARC trỏ về domain) trước khi gửi được — **không gửi được** bằng địa chỉ Gmail/Yahoo cá nhân | Cần sở hữu + cấu hình DNS cho 1 domain |
| **Nodemailer + SMTP** (tạm thời) | Chưa có domain riêng (mới bắt đầu dự án, môi trường dev/test) | Dùng SMTP của Gmail hoặc nhà cung cấp SMTP khác | Không có DKIM/domain reputation riêng → **thư rất dễ rơi vào mục Spam**; Gmail SMTP còn giới hạn số lượng gửi/ngày (~500) nên không phù hợp production lâu dài |

**Cách tổ chức để đổi qua lại không phải sửa code nghiệp vụ**: bọc việc gửi email sau 1 interface chung trong module `modules/email/`, chọn implementation qua biến môi trường:

```js
// modules/email/email.service.js
const provider = process.env.EMAIL_PROVIDER === 'smtp'
  ? require('./providers/nodemailer.provider')
  : require('./providers/resend.provider');

async function sendEmail({ to, subject, template, data }) {
  return provider.send({ to, subject, html: renderTemplate(template, data) });
}
module.exports = { sendEmail };
```

- Nơi gọi (`auth.service.js` gửi magic link, `users.service.js` gửi mật khẩu mới...) chỉ biết `emailService.sendEmail(...)`, không quan tâm đang chạy Resend hay SMTP — đúng nguyên tắc DRY, đổi môi trường (chưa có domain → có domain) chỉ cần đổi `EMAIL_PROVIDER` trong `.env`.
- Khi chuyển hẳn sang Resend ở production: mua/trỏ domain, verify trên dashboard Resend, cập nhật `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, không cần deploy lại logic gửi mail.

---

## 6. Frontend — stack & quy ước

### 5.1. Chọn Next.js hay React thuần

| Loại app | Công nghệ | Lý do |
|---|---|---|
| App hướng SEO, public-facing (storefront khách hàng) | **Next.js + TypeScript** | Cần SSR/SSG cho Google index tốt (trang chủ, danh mục, chi tiết sản phẩm) |
| App nội bộ (admin dashboard, tool quản trị) | **React (Vite) + TypeScript** hoặc Next.js tuỳ quy mô | Không cần SEO, ưu tiên tốc độ dev, có thể dùng CSR thuần |

- Với dự án **lớn**, tách `apps/client` (Next.js — storefront) và `apps/admin` (React/Next.js — quản trị) thành 2 app frontend riêng biệt, dùng chung 1 backend API và có thể chung 1 package UI/types (monorepo qua Turborepo/Nx nếu cần).
- Với dự án **nhỏ/vừa** (giai đoạn đầu của Flower Shop): 1 app Next.js duy nhất, tách route `/admin/*` bằng route group + middleware bảo vệ (xem mục 7).

### 5.2. Package chuẩn & quy ước code

| Nhu cầu | Package | Quy ước |
|---|---|---|
| Validate schema | `zod` | Định nghĩa schema 1 lần, dùng lại cả cho `react-hook-form` (frontend) và validate request body (backend) — tránh lặp rule |
| Form | `react-hook-form` + `@hookform/resolvers/zod` | Validate từng field theo schema zod, hiển thị lỗi ngay dưới field |
| Data fetching / server state | `@tanstack/react-query` + `axios` | Không tự quản lý loading/error state thủ công bằng `useState`; cache, refetch, invalidate qua React Query |
| Global client state (UI state, không phải server data) | `zustand` | Chỉ dùng cho state thật sự cần chia sẻ toàn cục (vd: user session, cart badge, sidebar mở/đóng) — không lạm dụng để lưu server data (đó là việc của React Query) |
| Styling | `TailwindCSS` | Ưu tiên Tailwind thay vì thư viện UI dựng sẵn (MUI, AntD) để dễ tuỳ biến theo brand hoa; có thể dùng Radix UI (headless, không kèm style) cho các component phức tạp (Dialog, Dropdown) rồi tự style bằng Tailwind |

### 5.3. Custom hook — tách logic khỏi UI

Mọi lời gọi API phải đi qua custom hook, component chỉ lo render:

```ts
// features/products/hooks/useProducts.ts
export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.list(filters),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
}
```

```tsx
// component chỉ render, không biết axios/react-query tồn tại
function ProductList({ filters }: Props) {
  const { data, isLoading } = useProducts(filters);
  if (isLoading) return <Spinner />;
  return <ul>{data.map(p => <ProductCard key={p.id} product={p} />)}</ul>;
}
```

`services/productService.ts` chỉ chứa các hàm gọi axios thuần (không React), tái sử dụng được cả ngoài React (script, test).

---

## 7. Routing sạch sẽ

### 6.1. Frontend (Next.js App Router)

```
app/
├── (storefront)/           # PUBLIC — ai cũng vào được
│   ├── page.tsx
│   └── products/[slug]/page.tsx
├── (account)/               # PROTECTED — cần đăng nhập (bất kỳ role nào)
│   ├── layout.tsx           # redirect '/login' nếu chưa auth
│   └── profile/page.tsx
├── admin/                   # PRIVATE — cần role admin/super_admin
│   ├── layout.tsx           # kiểm tra permission, redirect 403 nếu member thường
│   └── products/page.tsx
├── superadmin/               # PRIVATE — chỉ super_admin (quản lý user, bật/tắt auth method)
│   ├── layout.tsx
│   └── users/page.tsx
└── (auth)/                  # PUBLIC — trang login/register, redirect nếu đã đăng nhập
    ├── login/page.tsx
    └── register/page.tsx
```

- `middleware.ts` ở gốc `app/` chặn sớm ở edge: đọc cookie session, nếu route thuộc `/admin` hoặc `/superadmin` mà chưa có session hợp lệ → redirect `/login`.
- Kiểm tra **role/permission chi tiết** (không chỉ "đã đăng nhập") thực hiện trong `layout.tsx` của từng nhóm route (Server Component, đọc session từ cookie, gọi API `/me` hoặc decode JWT).
- Route `(auth)` (login/register) tự redirect về trang chủ nếu người dùng đã có session — tránh vào lại trang login khi đã đăng nhập.

### 6.2. Backend (Express)

```js
// routes chia theo mức độ truy cập, không trộn lẫn
router.use('/api/public', publicRouter);                                  // không cần auth
router.use('/api/account', authenticate, accountRouter);                  // cần đăng nhập
router.use('/api/admin', authenticate, authorize('admin_area'), adminRouter);
router.use('/api/superadmin', authenticate, authorize('superadmin_only'), superAdminRouter);
```

- `authenticate`: verify JWT/cookie, gắn `req.user` (kèm roles + permissions).
- `authorize(...)`: kiểm tra permission cụ thể theo route (xem [DATABASE.md §2.5](DATABASE.md)).
- Không có route nào "quên" auth vì được gom nhóm theo prefix rõ ràng, dễ review khi thêm route mới.

---

## 8. Checklist khi tạo module backend mới

1. Tạo folder `modules/<domain>/` với `routes` → `controller` → `service` → (`repository` nếu cần).
2. Định nghĩa zod schema trong `<domain>.validation.js`, áp middleware `validate()` vào route.
3. Mọi controller async bọc `asyncHandler`.
4. Lỗi nghiệp vụ throw `AppError`, không tự trả `res.status(...)` rải rác trong service.
5. Nếu route cần quyền → thêm `authorize('permission.code')`, thêm permission mới vào seed nếu chưa có (xem [DATABASE.md §2.3](DATABASE.md)).
6. Viết service dạng pure function (nhận tham số rõ ràng, không đọc `req` trực tiếp) để dễ test/tái sử dụng.

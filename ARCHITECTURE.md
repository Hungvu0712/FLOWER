# 🏗️ Kiến trúc & Quy ước dự án

Chuẩn kỹ thuật chung cho **Reusable PERN Stack Source Base** — kiến trúc backend, stack frontend, quy ước package, API, bảo mật, và chiến lược để repo này dùng lại được cho nhiều dự án PERN khác (nhỏ → vừa), không chỉ riêng nghiệp vụ shop hoa. Đọc cùng [README.md](README.md) (chức năng & trạng thái triển khai), [DATABASE.md](DATABASE.md) (schema & RBAC), [SECURITY.md](SECURITY.md) (bảo mật).

> Tài liệu này diễn giải lại **Master Prompt — Reusable PERN Stack Source Base** thành convention áp dụng cho dự án cụ thể; bản gốc đầy đủ của master prompt vẫn còn trong lịch sử chat nếu cần đối chiếu.

---

## 1. Nguyên tắc chung

- **KISS · DRY · YAGNI · SOLID vừa đủ** — giải pháp đơn giản nhất giải quyết đúng vấn đề hiện tại, không thiết kế thừa cho tình huống chưa xảy ra.
- **Security by default**, **Separation of Concerns**, **Single Responsibility**, **Convention over Configuration**.
- **Không over-engineering**: không tạo `BaseController`/`BaseService`/`BaseRepository`/`BaseManager`/`BaseProcessor`/`BaseHandler` nếu abstraction đó không giải quyết vấn đề thực tế. Repository chỉ tạo khi logic truy vấn đủ phức tạp — không máy móc cho mọi module.
- **Không biến source base thành một framework riêng.**
- Khi có nhiều cách triển khai, ưu tiên cách **đơn giản và dễ bảo trì nhất**. Nếu 1 yêu cầu có nguy cơ over-engineering, đề xuất phương án đơn giản hơn trước khi code.

---

## 2. Chiến lược tái sử dụng — Core vs Domain

Mọi module (backend lẫn frontend) gắn nhãn rõ 1 trong 2 loại:

| Loại | Định nghĩa | Ví dụ trong dự án Flower Shop |
|---|---|---|
| **Core** | Không phụ thuộc nghiệp vụ cụ thể — giữ nguyên khi copy sang dự án PERN khác | Auth (3 phương thức), users/roles/permissions, media/file, email, audit log, system settings, routing skeleton (admin/superadmin/protected) |
| **Domain** | Đặc thù nghiệp vụ của dự án hiện tại — viết mới hoàn toàn cho mỗi dự án | Products, categories, occasions, cart, orders, payments, reviews, promotions, blog |

Giữ **1 repo duy nhất** (`backend/`, `frontend/`), không tách repo hay monorepo tooling riêng ở quy mô hiện tại — chỉ tổ chức thư mục để ranh giới core/domain rõ ràng. Bắt đầu 1 dự án mới = copy phần core, xoá/thay phần domain.

### 2.1. Khi bắt đầu 1 dự án mới từ source base này

1. Copy `backend/src/core/`, `backend/src/config/`, `backend/src/modules/core/`, `backend/src/routes/`, `backend/src/jobs/`, `backend/prisma/seed/core.seed.ts` và phần model core trong `schema.prisma`.
2. Copy `frontend/src/lib/`, `frontend/src/store/`, `frontend/src/proxy.ts`, `frontend/src/features/core/`, route `account/`, `admin/`, `superadmin/`, route group `(auth)/`.
3. Xoá `backend/src/modules/domain/` và `frontend/src/features/domain/` mẫu, viết domain mới theo nghiệp vụ dự án đó.
4. Đổi `.env` (DB mới, bucket R2 mới, domain Resend mới nếu có) — không phần nào của core cần sửa code.

---

## 3. Backend — Kiến trúc & luồng xử lý

**Stack:** Node.js · Express · **TypeScript (strict mode)** · Prisma ORM · Zod.

**Kiến trúc:** Modular + MVC + Service Layer.

```
Request → Route → Middleware → Controller → Service → Repository/Prisma → Database
```

- **Controller**: chỉ nhận request, gọi Service, trả response qua `core/response`. Không chứa business logic.
- **Service**: business logic, transaction, business rule.
- **Repository**: chỉ tạo khi query đủ phức tạp và được tái sử dụng nhiều nơi (vd `auth.repository.ts`) — không bắt buộc cho mọi module (vd `roles`, `permissions` gọi Prisma thẳng trong service vì logic đơn giản).

### 3.1. Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/              # 🔧 env (validate + fail-fast), prisma client, r2 client
│   ├── core/                 # 🔧 hạ tầng dùng chung toàn app — KHÔNG chứa business logic
│   │   ├── errors/            # AppError, ValidationError
│   │   ├── middleware/        # asyncHandler, authenticate, authorize, errorHandler, requestId, validate
│   │   ├── response/          # ApiResponse: ok(), created(), paginated()
│   │   ├── logger/            # logger (gắn requestId, ẩn thông tin nhạy cảm)
│   │   └── utils/              # hash, jwt, rbac (load role/permission)
│   ├── modules/
│   │   ├── core/               # 🔧 copy nguyên khi sang dự án mới
│   │   │   ├── auth/            # login (3 phương thức), refresh, logout, magic-link
│   │   │   ├── users/            # self-service (profile, password, sessions) + admin (SuperAdmin quản lý user)
│   │   │   ├── roles/            # CRUD Custom Role
│   │   │   ├── permissions/      # CRUD Permission
│   │   │   ├── settings/          # bật/tắt phương thức đăng nhập (mở rộng thành System Settings ở Phase 4)
│   │   │   ├── files/             # upload R2, quản lý folder — đổi tên thành `media` ở Phase 4 (xem §8)
│   │   │   ├── email/             # abstraction Resend/SMTP
│   │   │   └── audit-log/
│   │   └── domain/              # 🌸 viết mới cho từng dự án (products, orders, categories...)
│   ├── routes/
│   │   └── v1/                  # gom router từng module thành /api/v1/*
│   ├── types/                  # augmentation Express (req.user, req.requestId)
│   ├── jobs/                   # 🔧 cron: backup DB, dọn file mồ côi
│   ├── app.ts                  # đăng ký middleware + route, KHÔNG gọi listen() (dễ test)
│   └── server.ts                # entrypoint: listen + graceful shutdown + đăng ký cron
├── prisma/
│   ├── schema.prisma            # model core ở đầu file, model domain ở cuối (banner comment phân tách)
│   └── seed/
│       ├── core.seed.ts          # 🔧 3 System Role, permission core, login_method_settings, super_admin mặc định
│       └── domain.seed.ts        # 🌸 role/permission domain, dữ liệu mẫu
├── tests/
├── .env.example
└── README.md
```

Mỗi module độc lập, chỉ gồm những file thực sự cần: `*.routes.ts → *.controller.ts → *.service.ts → (*.repository.ts nếu cần) → *.validation.ts`.

### 3.2. Error handling

Một class lỗi chuẩn (`core/errors/AppError.ts`) + một error handler duy nhất (`core/middleware/errorHandler.ts`), không try/catch lặp lại trong controller — mọi controller async bọc `asyncHandler`.

```ts
// core/errors/AppError.ts
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true; // lỗi nghiệp vụ đã lường trước, khác lỗi hệ thống (bug)
  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') { ... }
}
```

Trong service, `throw new AppError(...)` thay vì return null/false mập mờ. Không throw string, không nuốt lỗi bằng catch rỗng.

---

## 4. Response & Error format chuẩn

Mọi API trả về đúng 1 trong 3 dạng sau (xử lý tập trung ở `core/response/ApiResponse.ts` và `core/middleware/errorHandler.ts`):

**Success:**
```json
{ "success": true, "message": "Success", "data": {} }
```

**Validation error** (từ `core/middleware/validate.ts`, zod `ZodError` → field-level errors):
```json
{ "success": false, "message": "Validation failed", "errors": { "email": "Email không hợp lệ" } }
```

**Lỗi nghiệp vụ khác** (`AppError`):
```json
{ "success": false, "message": "Bạn không có quyền thực hiện thao tác này", "code": "FORBIDDEN" }
```

**Pagination** (danh sách có phân trang, dùng `paginated()`):
```json
{ "success": true, "message": "Success", "data": [], "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }
```

Không bao giờ trả stack trace hay chi tiết lỗi hệ thống cho client (kể cả dev lẫn production) — lỗi lạ (không phải `AppError`) log đầy đủ ở server, trả về message chung `INTERNAL_ERROR`.

---

## 5. API

- **Versioning bắt buộc**: mọi route mount dưới `/api/v1` (xem `routes/v1/index.ts`), ví dụ `/api/v1/auth`, `/api/v1/account`, `/api/v1/superadmin/users`.
- Chuẩn hoá **pagination** (`page`, `limit` → `meta`), **filtering/search** (query param theo domain), response envelope như mục 4.
- **API documentation bằng OpenAPI/Swagger** — chưa triển khai, xem checklist Phase 1 ở [README.md §9](README.md).

---

## 6. Security

Xem đầy đủ ở [SECURITY.md](SECURITY.md). Riêng phần hạ tầng Express bắt buộc có sẵn trong `app.ts`:

- `helmet` (security headers), `cors` (whitelist `FRONTEND_URL`, `credentials: true`), `express-rate-limit` cho endpoint nhạy cảm.
- `cookie-parser` + cookie `httpOnly`/`secure` (theo `NODE_ENV`)/`sameSite`.
- `GET /health` — health check không versioning (nằm ngoài `/api/v1`).
- **Request ID**: `core/middleware/requestId.ts` gắn `X-Request-Id` cho mọi request, log kèm ID này để trace xuyên middleware/controller/service.
- **Graceful shutdown**: `server.ts` lắng nghe `SIGTERM`/`SIGINT`, đóng HTTP server + ngắt kết nối Prisma trước khi thoát tiến trình, tránh cắt ngang request đang xử lý.

---

## 7. Hạ tầng & Database

| Môi trường | Database | File storage |
|---|---|---|
| Development | **Neon Postgres** (serverless, free tier) | Cloudflare R2 (bucket dev) |
| Production nhỏ | Tiếp tục managed Postgres (Neon/Supabase...) | Cloudflare R2 |
| Production lớn | VPS + Docker + PostgreSQL tự quản lý | Cloudflare R2 |

- **Backup**: `pg_dump` **2 ngày/lần** lên R2 (bucket `backups/` riêng), **tự động xoá sau 30 ngày** — xử lý bằng cron job (`jobs/backupDatabase.job.js`), không phụ thuộc hoàn toàn vào tiến trình API đang chạy (cron chỉ chạy khi `NODE_ENV=production`, xem `server.ts`).
- Prisma: migration, seed, transaction, FK, unique constraint, index đầy đủ — xem [DATABASE.md](DATABASE.md). Soft delete chỉ dùng khi phù hợp (`users`, `products`, `files`) — không lạm dụng cho mọi bảng.

---

## 8. Lưu trữ file (R2) & Media Management

- Không hard-code R2 vào business logic — mọi thao tác file đi qua `files.service.ts` (Phase 4 sẽ bóc tách rõ thành `StorageService` độc lập: `upload()/delete()/getUrl()/exists()/move()` để sau này đổi R2 → S3/MinIO/Cloudinary không phải sửa business logic).
- **Trạng thái hiện tại**: module tên `files` (bảng `files`/`file_usages`, xem [DATABASE.md §3.3](DATABASE.md)). **Phase 4** sẽ đổi tên thành `media` + thêm cột `is_used` để tra cứu nhanh (không chỉ dựa vào `file_usages` join) — theo đúng metadata chuẩn của master prompt.
- Upload qua **presigned URL** (frontend PUT thẳng lên R2, không qua server Express).
- **Orphan detection**: file không còn `file_usages` nào trỏ tới + quá ngưỡng an toàn (24h) → cron **10 ngày/lần** xoá — xem [DATABASE.md §3.3](DATABASE.md), [SECURITY.md §5](SECURITY.md).

---

## 9. Email

Abstraction qua `modules/core/email/email.service.ts` — business logic không gọi thẳng Resend/Nodemailer.

| Phương án | Khi dùng | Nhược điểm |
|---|---|---|
| **Resend** (mặc định, production) | Đã có domain riêng, verify DKIM/SPF | Cần sở hữu + cấu hình DNS domain |
| **Nodemailer + SMTP** (thay thế) | Chưa có domain riêng | Dễ vào spam, Gmail SMTP giới hạn ~500 email/ngày |

Chọn provider qua `EMAIL_PROVIDER` env — đổi provider không sửa code gọi (`auth.service`, `users.admin.service`...). Chi tiết interface xem `modules/core/email/email.provider.ts`.

---

## 10. Authentication & RBAC

Chi tiết đầy đủ (schema, ràng buộc, ma trận quyền) ở [DATABASE.md](DATABASE.md) và [SECURITY.md](SECURITY.md). Tóm tắt convention:

- 3 phương thức đăng nhập bắt buộc: email/password, Google OAuth (verify ID token qua `google-auth-library`, không dùng luồng redirect passport), magic link (token hash, dùng 1 lần, hết hạn ngắn).
- Session: **Access token JWT ngắn hạn** (5p — ngắn để thay đổi role/permission lan tới nhanh hơn mà không cần đăng xuất thủ công) + **Refresh token đối lập, rotation, thu hồi được** — cả hai qua cookie `httpOnly`. Không dùng JWT dài hạn làm session duy nhất.
- RBAC: **permission-based** (`authorize('user.block')`), không hard-code role (`requireRole('Admin')`). Role chỉ là tập hợp Permission. Tối thiểu 3 System Role `super_admin`/`admin`/`member`, không xoá/rename được.
- SuperAdmin User Management: không tự block/đổi role/xoá chính mình, không tự tạo/gán `super_admin` qua chức năng thông thường — enforce ở **backend**, không dựa vào client-side restriction.

---

## 11. System Settings (Phase 4 — chưa triển khai)

Module tổng quát cho cấu hình hệ thống không nên hard-code:

```
site_name, site_logo, timezone, maintenance_mode, registration_enabled,
login_email_enabled, login_google_enabled, login_magic_link_enabled
```

**Hiện tại**: chỉ mới có `login_method_settings` (bật/tắt 3 phương thức đăng nhập, xem [DATABASE.md §3.2](DATABASE.md)). Phase 4 sẽ mở rộng thành bảng `system_settings` key-value tổng quát, `modules/core/settings/` đảm nhiệm cả 2.

---

## 12. Background Jobs

Cron job hiện tại (`node-cron`, chạy trong tiến trình Node — xem `jobs/index.js`): backup DB, dọn file mồ côi. **Không thêm Redis/BullMQ ngay từ đầu** — chỉ dùng khi workload thực sự cần queue mạnh (email hàng loạt, xử lý ảnh nặng...).

---

## 13. Frontend — stack & quy ước

### 13.1. Chọn Next.js hay React + Vite

| Loại app | Công nghệ |
|---|---|
| Public/SEO (storefront, landing, content site) | **Next.js + TypeScript** |
| Internal (admin, dashboard, tool nội bộ) | **React + Vite + TypeScript** |

Dự án lớn tách `apps/client/` (Next.js) và `apps/admin/` (React/Vite) độc lập, dùng chung backend API.

### 13.2. Cấu trúc (feature-based)

```
frontend/src/
├── app/                # Next.js App Router — routes theo mục 14
├── components/ui/      # Button, Input, Select, Modal, Table, Toast... dùng chung
├── features/
│   ├── core/            # 🔧 mỗi feature = *.service.ts (axios) + *.hooks.ts (TanStack Query)
│   └── domain/           # 🌸 products, cart, orders...
├── lib/                 # 🔧 axios instance, decode JWT (UX only, không phải security boundary)
├── store/                # 🔧 Zustand — chỉ UI/client state, KHÔNG cache server data
└── proxy.ts               # 🔧 Next.js 16 "proxy" (đổi tên từ middleware.ts) — bảo vệ route sớm
```

Tách rõ **UI ≠ API ≠ Business Logic ≠ State**. Component không tự gọi axios — luôn qua custom hook (`useAuth()`, `useUsers()`...).

### 13.3. Package chuẩn

| Nhu cầu | Package | Quy ước |
|---|---|---|
| Validate | `zod` + `react-hook-form` (`@hookform/resolvers/zod`) | Schema dùng lại được cả 2 phía FE/BE — nhưng **backend luôn validate lại**, không tin FE |
| Data fetching | `@tanstack/react-query` + `axios` | Server state, cache, mutation, pagination — không tự quản `useState` cho loading/error |
| Global state | `zustand` (chỉ khi thật sự cần) | UI state (sidebar, modal, theme) — KHÔNG thay thế TanStack Query cho server state |
| Style | `TailwindCSS` | Không phụ thuộc cứng UI library lớn; xây bộ component dùng chung (Button, Input, Modal, Table, Toast, Empty/Error State, Confirm Dialog...) |

---

## 14. Routing

### 14.1. Backend

```js
app.use('/api/v1/auth', authRouter);                                              // public
app.use('/api/v1/account', authenticate, accountRouter);                          // cần đăng nhập
app.use('/api/v1/superadmin/users', authenticate, authorize('users.manage'), usersAdminRouter);
app.use('/api/v1/categories', categoriesRouter);                                  // public — domain đọc (storefront)
app.use('/api/v1/admin/categories', authenticate, categoriesAdminRouter);         // domain quản trị (route tự authorize bên trong)
```

Gom nhóm theo prefix rõ ràng — không route nào "quên" `authenticate`. `/superadmin/*` dành riêng cho quản trị hệ thống (chỉ `super_admin`); `/admin/*` dành cho nghiệp vụ domain mà `admin`/`super_admin` đều dùng được tuỳ permission — 2 prefix này KHÔNG dùng thay thế nhau.

### 14.2. Frontend (Next.js App Router)

```
app/
├── (storefront)/     # 🌸 PUBLIC — domain
├── (auth)/           # 🔧 PUBLIC — /login, /register, /magic-link...
├── account/           # 🔧 PROTECTED — route thật (không phải route group) để proxy.ts match theo prefix
├── admin/             # 🔧 khung + 🌸 nội dung — role admin/super_admin
└── superadmin/         # 🔧 chỉ super_admin
```

`proxy.ts` chặn sớm theo pathname (đọc cookie, decode JWT không verify chữ ký — chỉ để UX). Permission chi tiết luôn được kiểm tra lại trong layout **và** ở backend — route guard frontend chỉ là lớp UX, không phải authorization thật.

---

## 15. Testing (Phase 6 — chưa triển khai)

Tối thiểu: Unit test, Integration test, API test — ưu tiên Authentication, Authorization/RBAC, User Management, Password Reset, Magic Link, OAuth, Audit Log. Không chạy theo coverage 100% máy móc.

---

## 16. Logging, Environment, Code Quality

- **Logger** (`core/logger/logger.ts`) gắn Request ID, **không log password/token/cookie/secret**. Log level khác nhau giữa dev/production (`LOG_LEVEL`).
- **Environment**: `.env` + `.env.example`, validate lúc khởi động (`config/env.ts`) — thiếu biến bắt buộc thì **fail fast** với lỗi rõ ràng, không lỗi mập mờ giữa chừng request.
- **Code quality**: TypeScript strict mode, ESLint (flat config, `typescript-eslint`) — Prettier/formatter thống nhất **chưa cấu hình**, xem checklist Phase 1.

---

## 17. Docker & Monorepo

Development không bắt buộc Docker toàn stack (FE/BE local, DB Neon, R2 Cloudflare). Production lớn: VPS + Docker (backend + Postgres + worker) + reverse proxy. Không bắt buộc monorepo tooling (Turborepo/Nx) ở quy mô nhỏ/vừa — chỉ cân nhắc khi thực sự tách nhiều app frontend dùng chung nhiều package.

---

## 18. Checklist khi tạo module backend mới

1. Xác định module thuộc `core` hay `domain` (mục 2), đặt đúng `modules/core/` hoặc `modules/domain/`.
2. Tạo `*.routes.ts → *.controller.ts → *.service.ts → (*.repository.ts nếu cần) → *.validation.ts`.
3. Validate bằng `zod` qua `core/middleware/validate.ts` — lỗi tự động thành `{ errors: {...} }`.
4. Controller bọc `asyncHandler`, trả response qua `core/response` (`ok`/`created`/`paginated`).
5. Lỗi nghiệp vụ `throw new AppError(...)`, không tự `res.status(...)` rải rác.
6. Cần quyền → `authorize('permission.code')`, thêm permission vào seed tương ứng (`core.seed.ts` hoặc `domain.seed.ts`).
7. Mount router trong `routes/v1/index.ts` dưới đúng prefix.

---

## 19. Lộ trình triển khai (7 Phase)

| Phase | Nội dung | Trạng thái |
|---|---|---|
| 1 — Foundation | TS strict, Express, Prisma, `.env` validate, error handler, response envelope, API versioning, security middleware, request ID, graceful shutdown | 🟡 Đang làm — xem [README.md §9](README.md) |
| 2 — Authentication | Email/Password, JWT, Cookie, Session, Google OAuth, Magic Link, Forgot Password | ⬜ Đã có ở bản JS trước, cần convert TS + kiểm thử lại |
| 3 — RBAC | Users, Roles, Permissions, SuperAdmin/Admin/Member, Audit Log | ⬜ Tương tự — logic đã có, cần convert TS |
| 4 — Infrastructure | R2 (đổi tên `files`→`media`, `StorageService`), Email Service, System Settings, Cleanup Jobs | ⬜ |
| 5 — Frontend | Đã scaffold Next.js + TanStack Query + Zustand + react-hook-form/zod, cần cập nhật API base URL sang `/api/v1` sau khi Phase 1 xong | 🟡 |
| 6 — Quality | Testing, Swagger, Logging, Health Check, Security review | ⬜ |
| 7 — Production | Docker, VPS, Reverse Proxy, Backup, Monitoring, Deployment | ⬜ |

Chi tiết trạng thái từng phần và việc còn thiếu — xem [README.md §9](README.md).

# 03 · Backend — hiện trạng so với chuẩn

> Mốc review: commit `bdf8d99`. Chuẩn đối chiếu: `backend-standard.md` của khoá học.
> Mã vấn đề: [02](02-VAN-DE-VA-RUI-RO.md).

## 1. Bảng đối chiếu

| Tiêu chí chuẩn | Hiện trạng | Đánh giá |
|---|---|---|
| Modular theo feature | `modules/core/<10 module>` + `modules/domain/<13 module>`, mỗi module có `routes/controller/service/validation/openapi` | ✅ Tốt, còn tách thêm core/domain (vượt chuẩn) |
| `routes/index` hợp nhất | `routes/v1/index.ts` mount theo mức truy cập tăng dần, có comment lý do | ✅ — trừ `authenticate` chạy 2 lần với `/account/*` (BE-03) |
| `app.ts` / `server.ts` tách riêng | `app.ts` 38 dòng: middleware → routes → 404 → `errorHandler` cuối; `server.ts` 48 dòng: listen + graceful shutdown | ✅ Đúng chuẩn; thiếu handler cấp tiến trình, chưa đóng Socket.io (ERR-04) |
| Controller mỏng | 22 controller không import prisma, đều dùng `ok()/created()/paginated()` | ✅ Rất tốt (riêng `auth.controller.ts:22-27` ghi audit ở controller) |
| Service không chạm HTTP | Không service nào import `express`/`req`/`res`; `orders.service.ts:329-332` nhận `actorPermissions` qua tham số | ✅ |
| `shared/` không import ngược `modules/` | Không vi phạm | ✅ — nhưng **core chứa code domain** (ARCH-01) |
| `AppError` + `asyncHandler` + `errorHandler` tập trung | Có đủ; map Prisma P2002/P2025/P2003 | 🟡 Lỗi body-parser thành 500 (ERR-02); log lỗi có thể mất stack (ERR-03) |
| Response chuẩn | `{success, message, data}` + `meta` phân trang | 🟡 Lỗi dạng phẳng, validate thiếu `code`, không có danh mục mã lỗi (BE-02) |
| Validate zod ở route | Mọi route ghi có `validate()` trừ 3 route không có input; `:id` đều là `uuid()` | ✅ — còn lỗ hổng partial update coupon (VAL-01), ngày chỉ dùng regex (VAL-02) |
| ESM | CommonJS | 🟡 `[CHUẨN]` (BE-01) |
| `lib/` vs `utils/` | `config/{prisma,cloudinary}.ts` đóng vai trò `lib`; `shared/utils` là hàm thuần | ✅ Hợp lý, chỉ khác tên thư mục |
| Env validate bằng zod, fail-fast | `config/env.ts` validate cả **giá trị**, có kiểm production riêng (secret mặc định, 2 JWT secret trùng) | ✅ Vượt chuẩn — còn thiếu ép khoá backup (SEC-04) và chặn `DISABLE_RATE_LIMIT` (SEC-06) |
| Logger | pino JSON + `requestId`; không có `console.*` trong `src` | ✅ |
| Class | Chỉ `AppError`/`ValidationError` dùng class; còn lại là module export hàm | ✅ Nhất quán |
| Transaction cho thao tác nhiều bước | Có ở tạo đơn, role, đổi role user; **không có** ở product/addresses/files... | 🟡 DB-03 |
| Bảo mật HTTP | helmet, CORS theo env + credentials, `json({limit:"1mb"})`, trust proxy có số hop | ✅ — thiếu một số rate limit (SEC-06) |
| Versioning + health | `/api/v1`, `/health` | 🟡 Health không kiểm DB (OPS-03) |
| Script | `dev/build/start/lint/typecheck/format/test:*` | ✅ — thiếu `db:migrate:deploy` riêng (không nghiêm trọng) |

## 2. Điểm mạnh nên giữ nguyên

- **Quyền theo permission code, tra DB mỗi request**: `shared/middleware/authorize.ts:6-20` +
  `authenticate.ts:33-34`. Đổi role có hiệu lực ngay, không phụ thuộc token cũ.
- **Mass assignment được chặn tự động**: `validate.ts:25` gán lại `req.body` bằng kết quả
  `schema.parse`, nên trường thừa bị loại.
- **Chống race đúng cách** ở coupon (`orders.service.ts:199-208`, `updateMany` có điều kiện) và ở
  token dùng 1 lần (`auth.repository.ts:121-146`).
- **Chống dò tài khoản** ở quên mật khẩu/magic link, kèm comment giải thích vì sao nuốt lỗi gửi mail
  có chủ đích (một trong hai ngoại lệ mà CLAUDE.md cho phép).
- **OpenAPI sinh từ chính zod schema** (`openapi/generate.ts`), không phải viết tay song song.

## 3. Vấn đề chính (tóm tắt — chi tiết ở 02)

| Mã | Mức | Tóm tắt |
|---|---|---|
| ARCH-01 | Medium | Core chứa template/job nhắc lịch của domain; `server.ts` import domain; domain import sâu lẫn nhau |
| ARCH-02 | Medium | Rate limit và Socket.io trong bộ nhớ, nhưng compose/docs khẳng định scale "an toàn" |
| BE-01 | Medium `[CHUẨN]` | CommonJS |
| BE-02 | Medium `[CHUẨN]` | Shape lỗi và mã lỗi chưa chuẩn hoá |
| BE-03 | Low | `authenticate` 2 lần với `/account/*` |
| ERR-02..05 | Medium | Body-parser → 500; log mất stack; thiếu handler tiến trình; quy tắc đơn hàng hở |
| CODE-02, CODE-03 | Medium | Lặp `ensureUniqueSlug` ×4, phân trang ×15...; `orders.create` 187 dòng |

## 4. Cây thư mục đích (điều chỉnh theo module thật)

Không cần tổ chức lại toàn bộ; cấu trúc hiện tại đã gần chuẩn. Các ký hiệu: **➕** là file hoặc thư
mục cần thêm; **↪** là code cần chuyển từ nơi khác về.

```text
backend/
├── src/
│   ├── app.ts                         # giữ nguyên
│   ├── server.ts                      # + unhandledRejection/uncaughtException, io.close()  (ERR-04)
│   ├── config/                        # env.ts (zod), prisma.ts, cloudinary.ts — đóng vai trò lib/
│   ├── routes/v1/index.ts             # sửa thứ tự mount /account (BE-03)
│   ├── openapi/
│   ├── jobs/
│   │   ├── index.ts                   # + .catch cho mọi cron
│   │   ├── backupDatabase.job.ts      # ép mã hoá ở production, upload type "authenticated" (SEC-04)
│   │   ├── cleanupExpiredTokens.job.ts
│   │   └── cleanupOrphanFiles.job.ts  # xoá DB trước, Cloudinary sau (DB-04)
│   ├── modules/
│   │   ├── core/
│   │   │   ├── auth/                  # + rotateSession(), reuse detection theo rotatedAt (SEC-01)
│   │   │   ├── users/  roles/  permissions/  settings/  audit-log/  contact/
│   │   │   ├── files/                 # kiểm prefix publicId + uploadedBy (SEC-05)
│   │   │   ├── email/                 # CHỈ template core (magic link, reset, cảnh báo bảo mật)
│   │   │   └── realtime/              # initSocket + registerRealtimeHandlers(handlers[])
│   │   └── domain/
│   │       ├── orders/
│   │       │   ├── orders.service.ts          # create() tách nhỏ (CODE-03)
│   │       │   ├── orders.pricing.ts          # ➕ priceItems, bắt buộc variant (ERR-05)
│   │       │   └── orders.status.ts           # ➕ ALLOWED_TRANSITIONS (ERR-05)
│   │       ├── coupons/
│   │       │   └── index.ts                   # ➕ export computeDiscount/checkCoupon cho orders (ARCH-01)
│   │       ├── specialDates/
│   │       │   ├── specialDates.reminder.job.ts   # ↪ từ jobs/sendSpecialDateReminders.job.ts
│   │       │   └── specialDates.templates.ts      # ↪ từ core/email/email.templates.ts
│   │       └── products/ categories/ occasions/ blog/ reviews/ addresses/ wishlist/
│   │           newsletter/ siteContent/ dashboard/
│   └── shared/
│       ├── errors/
│       │   ├── AppError.ts  ValidationError.ts
│       │   └── errorCodes.ts          # ➕ danh mục mã lỗi (BE-02)
│       ├── middleware/
│       │   ├── errorHandler.ts        # + body-parser 400/413, log { err } (ERR-02, ERR-03)
│       │   └── rateLimiters.ts        # ➕ factory limiter dùng chung (SEC-06, CODE-02)
│       ├── response/ApiResponse.ts
│       ├── logger/
│       └── utils/
│           ├── slug.ts                # ➕ ensureUniqueSlug dùng chung (CODE-02, DB-02)
│           ├── pagination.ts          # ➕ paginationQuery schema + paginate() (CODE-02, VAL-02)
│           ├── tree.ts                # ➕ assertNoCycle (categories + folders)
│           └── hash.ts  jwt.ts  sanitizeHtml.ts  revokeSessions.ts ...
├── prisma/
│   ├── schema.prisma                  # + enum trạng thái (DB-01), + rotatedAt (SEC-01), + index (DB-05)
│   └── seed/                          # tách seed bắt buộc vs seed mẫu (SEC-07)
└── tsconfig.json                      # NodeNext khi chuyển ESM (BE-01)
```

## 5. Lộ trình chuyển đổi backend (từng bước, mỗi bước một PR)

1. **An toàn trước** (không đổi cấu trúc): SEC-01 + SEC-02 (thêm cột, xoá cookie), SEC-03, SEC-04,
   VAL-01, ERR-02. Mỗi mục kèm test hồi quy.
2. **Gom code lặp** vào `shared/utils` (CODE-02). Chạy lại toàn bộ test sau mỗi helper; sửa DB-02
   ngay khi gom `ensureUniqueSlug`.
3. **Chuẩn hoá lỗi** (BE-02): thêm `errorCodes.ts`, đổi dần theo module. Frontend `lib/errors.ts`
   phải đọc được cả shape cũ và mới trong giai đoạn chuyển tiếp.
4. **Dọn ranh giới core/domain** (ARCH-01): chuyển job và template nhắc lịch; mỗi module domain export
   qua `index.ts`.
5. **ESM** (BE-01): làm cuối cùng, khi test đã phủ tốt. Một PR riêng: `NodeNext`, thêm `.js` vào
   import tương đối, kiểm tra script seed (`tsx`).

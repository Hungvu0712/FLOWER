# 02 · Vấn đề và rủi ro

> **Mốc review**: commit `bdf8d99` — HEAD của `main`/`review` lúc checkout (24/09/2026 09:05).
> Số dòng trong bằng chứng là số dòng **tại commit đó**. Xem đúng nội dung được review bằng
> `git show bdf8d99:<đường-dẫn>`. Các thay đổi chưa commit trong working tree **không** được tính.
>
> **Hệ mã riêng của báo cáo này.** `BE-01`, `FE-01`, `OPS-01`... ở đây **khác** với các mã cùng tên
> trong `docs/12-danh-gia-va-de-xuat.md`. Cột "docs/12" chỉ ra mục tương ứng bên đó khi có.

Chú thích:

- **Nhãn**
  - `[NGUYÊN TẮC]`: vi phạm nguyên tắc chung của ngành.
  - `[CHUẨN]`: chưa theo chuẩn khuyến nghị của khoá học. Đây là cơ hội nâng cấp, mức tối đa `Medium`.
- **Độ chắc chắn**
  - **Đã xác nhận**: đọc code thấy rõ, hoặc đã tái hiện được.
  - **Rủi ro tiềm ẩn**: code cho phép xảy ra, nhưng hậu quả phụ thuộc cấu hình, dữ liệu hoặc thời điểm.
  - **Chưa đủ dữ liệu**: cần thông tin ngoài repo.

---

## 1. Bảng tổng hợp

### 🔴 High (6)

| Mã | Nhãn | Nhóm | Vị trí | Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|---|---|---|
| SEC-01 | NGUYÊN TẮC | Bảo mật | `auth.service.ts:314` | Reuse detection coi **mọi** `revokedAt` là token bị đánh cắp, kể cả phiên bị thu hồi hợp lệ | "Đăng xuất thiết bị B" khiến **mọi** phiên bị thu hồi và gửi email cảnh báo giả; lặp lại mỗi lần B tải trang | Thêm cột phân biệt "thu hồi do xoay vòng"; chỉ báo reuse với token đã xoay vòng |
| SEC-03 | NGUYÊN TẮC | Bảo mật | `auth.service.ts:137-151, 230-232, 277-291` | Đăng ký không xác minh email; Google/magic link gắn vào tài khoản sẵn có theo email | Kẻ tấn công đăng ký trước bằng email nạn nhân, giữ quyền truy cập sau khi nạn nhân dùng Google | Bắt xác minh email khi đăng ký; khi liên kết Google/magic link vào tài khoản chưa xác minh thì vô hiệu mật khẩu + phiên cũ |
| SEC-04 | NGUYÊN TẮC | Bảo mật | `backupDatabase.job.ts:37, 59-71`; `env.ts:80` | Backup DB: mã hoá là **tuỳ chọn**, upload `raw` công khai, tên theo timestamp dễ đoán | Nếu production thiếu khoá → dump toàn bộ DB (PII, hash mật khẩu) có thể tải công khai | Ép khoá mã hoá ở production (fail-fast), upload `type: "private"/"authenticated"` |
| ERR-01 | NGUYÊN TẮC | Validation & lỗi | `frontend/src/lib/axios.ts:12, 26-29, 42-47` | Refresh thất bại thì `pendingQueue = []`, bỏ rơi các request đang chờ | Promise treo vĩnh viễn; `useMe` kẹt "đang tải" với user cũ; chỉ F5 mới thoát | Hàng đợi lưu cặp `resolve/reject`, reject toàn bộ khi refresh lỗi |
| FE-01 | NGUYÊN TẮC | Frontend | `Nav.tsx:204, 287`; `providers.tsx:8-15`; `AdminShell.tsx:74-75` | Phiên chết nhưng cache `['account','me']` vẫn giữ user cũ | **Header vẫn hiện tên người dùng** sau khi bị đá về `/login`; AdminShell mở cổng bằng role cũ | Khi refresh 401/403 thì đặt `me = null`; chỉ tin kết quả fetch thành công |
| FE-02 | NGUYÊN TẮC | Frontend | `login/page.tsx:39, 55-61`; `redirect.ts:10`; `auth.hooks.ts:36-41` | Quay lại sau đăng nhập / tự phục hồi phiên sai đích, hoặc kẹt ở `/login` | Người dùng bị đẩy về trang chủ hoặc đứng im ở `/login` (docs/12 FE-08 ghi "đã xử lý" nhưng chưa đúng) | Đọc `redirectTo` bằng `useSearchParams`; chỉ điều hướng khi `/me` vừa fetch thành công; điều hướng cứng sau khi đổi trạng thái đăng nhập |

### 🟡 Medium (33)

| Mã | Nhãn | Nhóm | Vị trí | Vấn đề | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|---|---|---|
| ARCH-01 | NGUYÊN TẮC | Backend | `core/email/email.templates.ts:46`; `jobs/sendSpecialDateReminders.job.ts:31`; `orders.service.ts:5` | Ranh giới core/domain bị rò (core chứa logic domain); domain import sâu lẫn nhau | Khẳng định "core tái sử dụng không cần sửa code" không còn đúng | Chuyển template/job nhắc lịch sang domain; import qua API công khai của module |
| ARCH-02 | NGUYÊN TẮC | Backend | `docker-compose.yml:32`; `realtime.service.ts`; các `rateLimit(...)` | Tài liệu/compose nói scale ngang "an toàn" nhưng rate limit dùng memory store, Socket.io không có adapter | Scale >1 instance: sự kiện realtime và rate limit chỉ có tác dụng trên từng instance | Sửa comment; thêm Redis adapter + store khi thật sự scale |
| ARCH-03 | NGUYÊN TẮC | Frontend | `proxy.ts:18-21, 45-55`; `cookie.util.ts:41-45` | Proxy chặn route chỉ dựa vào cookie `access_token` sống 5 phút | Mọi phiên nhàn rỗi >5 phút đều bị đi vòng qua `/login` dù refresh token còn hạn — đây là "cửa ngõ" của FE-01/FE-02 | Thêm cookie gợi ý phiên (không nhạy cảm) cho proxy, hoặc refresh chủ động trước khi hết hạn |
| BE-01 | CHUẨN | Backend | `backend/tsconfig.json:5-6` | Backend dùng CommonJS (`module: CommonJS`) | Lệch chuẩn khoá học (ESM) | Chuyển `NodeNext` + `"type":"module"` theo lộ trình |
| BE-02 | CHUẨN | Backend | `errorHandler.ts:35, 46`; 111 lời gọi `new AppError(` | Shape lỗi phẳng, lỗi validate thiếu `code`; mã lỗi là chuỗi rải rác | Frontend khó xử lý lỗi theo mã; mã lỗi không nhất quán | Danh mục `errorCodes.ts`, shape `error: {code,message,details}` |
| SEC-02 | NGUYÊN TẮC | Bảo mật | `auth.controller.ts:55-58` | `/auth/refresh` thất bại không xoá cookie | Refresh token chết bị gửi lại ở mọi lần tải trang (khuếch đại SEC-01) | `clearAuthCookies` khi lỗi 401/403 |
| SEC-05 | NGUYÊN TẮC | Bảo mật | `files.service.ts:56-69, 113-123`; `files.routes.ts:15-16` | Tin `publicId` do client gửi, không kiểm tiền tố `uploads/`; không kiểm chủ sở hữu file khi gán avatar | Member bất kỳ có thể khiến server xoá ảnh >10MB trên Cloudinary; gán file người khác làm avatar | Kiểm tiền tố + `uploadedBy`; rate limit presign |
| SEC-06 | NGUYÊN TẮC | Bảo mật | `auth.routes.ts:72-83`; `coupons.routes.ts:10`; `orders.routes.ts:34`; `env.ts:97-114` | Thiếu rate limit ở refresh, magic-link verify, `/coupons/validate`, tra đơn, presign, đổi mật khẩu | Dò mã giảm giá, lạm dụng tài nguyên | Thêm limiter; chặn `DISABLE_RATE_LIMIT` ở production |
| SEC-07 | NGUYÊN TẮC | Bảo mật | `core.seed.ts:144, 159-161`; `domain.seed.ts:203-206`; `docs/10:346-347` | Seed in mật khẩu ra console, dùng mật khẩu mặc định; tài liệu hướng dẫn chạy seed domain (coupon mẫu dùng vô hạn) ở production | Coupon mẫu và mật khẩu mặc định có thể lọt vào production | Chặn seed mẫu khi `NODE_ENV=production`; không in mật khẩu |
| DB-01 | NGUYÊN TẮC | Database | `schema.prisma:23, 417-418, 431, 551` | Trạng thái là `String` tự do, không có enum/CHECK | DB nhận giá trị rác nếu ghi ngoài luồng zod | Prisma `enum` hoặc CHECK constraint |
| DB-02 | NGUYÊN TẮC | Database | `products.service.ts:85-87`; migration `add_products:30` | Kiểm trùng slug bỏ qua bản ghi xoá mềm, nhưng unique index áp lên mọi bản ghi | Tạo lại sản phẩm cùng tên với sản phẩm đã xoá → `409 DUPLICATE` | Kiểm trùng tính cả bản ghi đã xoá, hoặc dùng partial unique index |
| DB-03 | NGUYÊN TẮC | Database | `products.service.ts:242-256, 294-310, 157-165`; `addresses.service.ts:34-56` | Thao tác nhiều bước không nằm trong transaction | Sản phẩm tạo dở khi occasion sai; có thể có 2 địa chỉ mặc định | Gói vào `$transaction`, validate trước khi ghi |
| DB-04 | NGUYÊN TẮC | Database | `files.service.ts:167-171`; `cleanupOrphanFiles.job.ts:17, 26-27` | Xoá mềm file không kiểm file còn được dùng; job xoá trên Cloudinary trước rồi mới xoá DB (bị FK chặn) | Ảnh sản phẩm có thể mất vĩnh viễn trong khi bản ghi vẫn trỏ tới | Chặn xoá file đang dùng; xoá DB trước, Cloudinary sau |
| VAL-01 | NGUYÊN TẮC | Validation & lỗi | `coupons.validation.ts:47-52`; `coupons.service.ts:32, 141-156`; `orders.service.ts:222` | PATCH một phần bỏ qua ràng buộc `percent ≤ 100` và `endDate > startDate` | Mức giảm vượt subtotal → **tổng đơn âm** | Validate trên dữ liệu sau khi merge ở service; kẹp discount ≤ subtotal |
| VAL-03 | CHUẨN | Validation & lỗi | `thanh-toan/page.tsx`; 9 trang CRUD admin; `ContactPageView.tsx` | Chỉ 7 form dùng RHF + zod; các form còn lại tự quản bằng `useState`, không có `<form>`, không `setError` | Không có validate phía client, UX lỗi kém, lệch quy ước của chính dự án | RHF + zod theo từng feature |
| ERR-02 | NGUYÊN TẮC | Validation & lỗi | `errorHandler.ts:62-69`; `app.ts:24` | JSON sai cú pháp hoặc body quá lớn trả `500` | Log báo lỗi hệ thống giả; client nhận sai mã lỗi | Xử lý `entity.parse.failed` → 400, `entity.too.large` → 413 |
| ERR-03 | NGUYÊN TẮC | Validation & lỗi | `logger.ts:23-26`; `errorHandler.ts:64` | Lỗi được gói vào field `detail`, pino chỉ serialize field `err` | Log production có thể mất message/stack của lỗi 500 | Log `{ err }` theo đúng serializer của pino |
| ERR-04 | NGUYÊN TẮC | Validation & lỗi | `server.ts:32-48`; `jobs/index.ts:12-16` | Không bắt `unhandledRejection`/`uncaughtException`; Socket.io không được đóng khi shutdown | Cron lỗi không được log rõ; shutdown luôn phải force exit sau 10s | Thêm handler, `io.close()`, `.catch` cho cron |
| ERR-05 | NGUYÊN TẮC | Validation & lỗi | `orders.service.ts:68-77, 145-152, 333-395` | Bỏ `variantId` thì tính theo `basePrice`; không hoàn lượt coupon khi huỷ; không có máy trạng thái đơn | Đặt sai giá/size; coupon giới hạn bị tiêu hao; đơn nhảy trạng thái tuỳ ý | Bắt buộc `variantId` khi sản phẩm có biến thể; bảng chuyển trạng thái hợp lệ |
| FE-03 | NGUYÊN TẮC | Frontend | `admin/products/page.tsx` (550 dòng), `categories` (512)… 9 trang | Cùng một khung CRUD bị copy-paste; form tạo/sửa bị nhân đôi inline | Sửa 1 hành vi phải sửa 9 nơi | Tách `XxxForm` + hook dùng chung theo feature |
| FE-04 | NGUYÊN TẮC | Frontend | `admin/products/page.tsx:449-452` + ~20 trang | Không trang danh sách nào hiển thị `isError` | Lỗi API hiện thành "Chưa có dữ liệu" — gây hiểu nhầm nghiêm trọng cho admin | Thêm error state kèm nút thử lại |
| FE-05 | CHUẨN | Frontend | `PaginationMeta` ×10; `Category` ×5; 38 hàm trả `AxiosResponse<any>` | Types trùng lặp, không tập trung | Lệch kiểu âm thầm giữa các nơi | `shared/types` + unwrap response nhất quán |
| FE-06 | NGUYÊN TẮC | Frontend | `account.hooks.ts:27-34`; `roles.hooks.ts:17-55`; `orders.hooks.ts:28-31` | Nhiều mutation không invalidate dữ liệu liên quan | Danh sách thiết bị, role, dashboard hiển thị dữ liệu cũ | Liệt kê phụ thuộc; dùng key factory |
| FE-08 | NGUYÊN TẮC | Frontend | ~76/89 `<label>` không gắn control; `ConfirmDialog.tsx:13-14`; `Toaster.tsx:13` | Accessibility (a11y — khả năng tiếp cận) yếu: label, dialog, toast, `Link` bọc `Button` | Người dùng screen reader/bàn phím khó dùng trang admin và checkout | Dùng `FormField` ở mọi nơi; bật `jsx-a11y/recommended` |
| FE-09 | NGUYÊN TẮC | Frontend | `admin/orders/page.tsx:257-263`; `superadmin/users/page.tsx:96-142`; `account/devices/page.tsx:21-57` | Thao tác phá huỷ không hỏi xác nhận (huỷ đơn — trạng thái cuối, khoá user, reset mật khẩu...) | Bấm nhầm là mất đơn, không hoàn tác được | Dùng `confirmDialog` như `docs/04:279` quy định |
| CODE-01 | NGUYÊN TẮC | Clean code | `proxy.ts:24-26, 41, 53`; `redirect.ts:7, 14-17`; `login/page.tsx:41, 58` | Log DEBUG tạm thời bị commit lên `main` | Log server mỗi request; log object `me` (email, quyền) ra console trình duyệt | Xoá log; thêm rule `no-console` |
| CODE-02 | NGUYÊN TẮC | Clean code | `ensureUniqueSlug` ×4, pagination ×13–15, `assertNoCycle` ×2, revoke session ×3 | Vi phạm DRY vượt ngưỡng rule-of-three | Các bản sao đã lệch nhau → sinh ra DB-02 | Gom vào `shared/utils` |
| CODE-03 | NGUYÊN TẮC | Clean code | `orders.service.ts:82-268` (187 dòng) | Hàm `create` ôm 7 trách nhiệm | Khó test từng quy tắc, khó sửa an toàn | Tách `priceItems`, `applyCoupon`, `persistOrder` |
| TEST-01 | NGUYÊN TẮC | Kiểm thử | `tests/unit/axios.test.ts:89-94`; `e2e/*` chỉ dùng `page.goto` | Không có test cho luồng phiên phía client khi điều hướng mềm | FE-01, FE-02, ERR-01 lọt qua cả 3 tầng test | Test interceptor với nhiều request xếp hàng; E2E bấm Link sau khi token hết hạn |
| TEST-02 | NGUYÊN TẮC | Kiểm thử | `auth.service.test.ts:678-766`; `prisma.mock.ts:27-29` | Test "khoá" đúng hành vi sai của SEC-01; mock `$transaction` không rollback | Test xanh nhưng hành vi sai; race/rollback không được kiểm thật | Test phân biệt lý do thu hồi; thêm DB test cho transaction |
| DOC-01 | NGUYÊN TẮC | Tài liệu | `README.md:49`; `frontend/README.md:13`; `docs/09:7`; `frontend/.gitignore:34` | Hướng dẫn `cp .env.local.example` nhưng file không tồn tại (và bị `.gitignore` chặn) | Người mới làm theo quick start sẽ lỗi ngay bước đầu | Thêm `frontend/.env.example` + `!.env.example` |
| DOC-02 | NGUYÊN TẮC | Tài liệu | `README.md:62-63, 129`; `docs/01 §3.2`; `docs/modules/core-auth.md:98-216`; `docs/12:829` | Tài liệu lệch code ở nhiều nơi (số test, trạng thái tính năng, luồng auth, FE-08 "đã xử lý") | Người đọc tin vào thông tin sai — trái với chính CLAUDE.md | Quy trình "đổi code → đổi docs" trong PR; rà lại các mục đã liệt kê |
| OPS-01 | NGUYÊN TẮC | Vận hành | `git log`: `bdf8d99` trên `main`; `CHECKLIST.md:141`; `ci.yml:83-86` | Commit WIP debug đẩy thẳng lên `main`; chưa bật branch protection; E2E chỉ chạy sau khi merge | Lỗi và log tạm vào nhánh chính mà không có cổng chặn | Bật branch protection, E2E chạy trên PR |

### 🟢 Low (22)

| Mã | Nhãn | Nhóm | Vị trí | Vấn đề | Hướng xử lý |
|---|---|---|---|---|---|
| BE-03 | NGUYÊN TẮC | Backend | `routes/v1/index.ts:43-56` | `authenticate` chạy 2 lần cho `/account/*` | Mount `usersRouter` ở path cụ thể |
| SEC-08 | NGUYÊN TẮC | Bảo mật | `orders.service.ts:24`; `orders.realtime.ts:57-61`; `newsletter.service.ts:31-40` | Endpoint công khai lộ `userId` / nhận thao tác không cần token (huỷ đăng ký newsletter) | Bỏ `userId` khỏi select công khai; token huỷ đăng ký |
| SEC-09 | NGUYÊN TẮC | Bảo mật | `orders.admin.routes.ts:41-45`; `orders.service.ts:340-360`; `authenticate.ts:25-35` | Kiểm quyền sau khi đọc dữ liệu (dò được đơn tồn tại); user bị khoá còn dùng được ≤5 phút | `authorize` ở route; thu hồi phiên khi khoá |
| SEC-10 | NGUYÊN TẮC | Bảo mật | `auth.validation.ts:7, 13`; `auth.service.ts:156-157` | Email không chuẩn hoá chữ thường; login trả sớm khi email không tồn tại (timing oracle) | `.toLowerCase().trim()`; so sánh hash giả |
| SEC-11 | NGUYÊN TẮC | Bảo mật | `app.ts:25, 32`; `jwt.ts:19`; `env.ts:34`; `Caddyfile` | Swagger công khai; cookie secret không dùng; không pin thuật toán JWT; không có CSP | Gắn guard môi trường; pin `HS256`; CSP |
| SEC-12 | NGUYÊN TẮC | Bảo mật | `blog/[slug]/page.tsx:79`; `san-pham/[slug]/page.tsx:111` | Render HTML chỉ dựa vào sanitize lúc ghi | Sanitize khi render hoặc thêm CSP (defense in depth) |
| DB-05 | NGUYÊN TẮC | Database | `schema.prisma` | Thiếu index: `orders.created_at`, các cột `expires_at`, `email_logs`, `reviews.user_id`... | Thêm index theo truy vấn thật |
| DB-06 | NGUYÊN TẮC | Database | `migrations/20260908165640_add_category_fields` | Migration thêm cột NOT NULL không có default; 13/16 migration đặt tên tay; không kiểm drift | `prisma migrate diff` trong CI |
| DB-07 | NGUYÊN TẮC | Database | `schema.prisma:131-152` | Bảng token có `userId` nhưng không có FK; xoá mềm không nhất quán giữa các model | Thêm relation; ghi rõ chính sách xoá |
| VAL-02 | NGUYÊN TẮC | Validation & lỗi | `specialDates.validation.ts:6, 10`; `orders.validation.ts:19`; `page` ×13 | Ngày chỉ kiểm bằng regex (`2026-13-01` → 500, `02-31` → trôi tháng); `page` không có giới hạn trên | `z.iso.date()` + kiểm lịch; `page.max()` |
| ERR-06 | NGUYÊN TẮC | Validation & lỗi | `orders.validation.ts:33-35`; `dashboard.service.ts:102, 113` | Trộn giờ local và UTC; container không đặt TZ | Chốt 1 múi giờ nghiệp vụ |
| ERR-07 | NGUYÊN TẮC | Validation & lỗi | `useConfirmStore.ts:26-35`; `products/page.tsx:382-389`; `useCartStore.ts:79-82` | Promise confirm cũ treo; upload không `catch`; cart persist không có version/migrate | Settle promise cũ; `version` + `migrate` |
| FE-07 | CHUẨN | Frontend | 61 literal `queryKey` / 25 file | Không có query key factory, namespace lẫn lộn | `xxxKeys` theo feature |
| FE-10 | CHUẨN | Frontend | `global-error.tsx:32-50`; `(storefront)/layout.tsx:28`; 48 class `red-*`/`amber-*` | Hard-code màu, thiếu token danger/warning/success | Bổ sung token, thay class |
| FE-11 | NGUYÊN TẮC | Frontend | `HeroPetals.tsx:4`; `superadmin/users/page.tsx:26, 46`; `limit: 100` ×4 | three.js tải tĩnh; search không debounce; không phân trang; `isPending` dùng chung cho mọi hàng | `next/dynamic`, debounce, phân trang |
| CODE-04 | CHUẨN | Clean code | `proxy.ts:30-36`; `login/page.tsx:33-38`; `axios.ts:37-40` | Comment quá dày, dạng nhật ký, có đoạn sai lệch với hành vi thật | Giữ "vì sao", chuyển lịch sử sang docs/commit |
| CODE-05 | CHUẨN | Clean code | `backend/.prettierrc.json` vs `frontend/.prettierrc.json`; `eslint.config.mjs` | Prettier lệch kiểu nháy; không có `no-console`, `jsx-a11y`; zod v3 (BE) và v4 (FE) | Prettier chung ở gốc; bổ sung rule |
| CODE-06 | NGUYÊN TẮC | Clean code | `icons.tsx:225`; `vitest.config.ts:33`; `.design/*.html` 2,5 MB; `ve-chung-toi/page.tsx:12` | Dead code, file rác, TODO không có mã theo dõi | Dọn; TODO kèm mã CHECKLIST |
| TEST-03 | NGUYÊN TẮC | Kiểm thử | `frontend/e2e/` | Không có E2E cho giỏ hàng → checkout → xem đơn (luồng doanh thu) | Thêm 1 E2E luồng chính |
| DOC-03 | CHUẨN | Tài liệu | `docs/gitbook/` | Chưa có hướng dẫn người dùng cuối theo vai trò (gitbook dành cho khách hàng/bên liên quan) | `docs/user-guide.md` cho admin/florist |
| OPS-02 | CHUẨN | Vận hành | gốc repo | Không có `package.json` gốc (workspaces/concurrently), `.editorconfig`, husky | npm workspaces + lint-staged |
| OPS-03 | NGUYÊN TẮC | Vận hành | `app.ts:28`; `frontend/Dockerfile:29-32`; `docker-compose.yml:56-62` | `/health` không kiểm DB; image frontend chứa devDeps; `depends_on: service_started` không chờ migrate | Health kiểm DB; `output: standalone`; healthcheck |

---

## 2. Chi tiết theo mã

### 🔴 High

#### SEC-01 · Reuse detection báo nhầm với phiên bị thu hồi hợp lệ

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Bảo mật & phân quyền. docs/12 liên quan: BE-03.
- **Bằng chứng**:
  - `backend/src/modules/core/auth/auth.service.ts:314`: `if (session?.revokedAt) { await revokeAllUserSessions(...) ... sendEmail(security_alert) }`.
  - `revokedAt` cũng được ghi bởi các luồng **hợp lệ**:
    - đăng xuất: `auth.service.ts:352` → `auth.repository.ts:102-104`
    - "đăng xuất thiết bị": `users.service.ts:96-105`
    - "đăng xuất thiết bị khác" và đổi mật khẩu: `revokeSessions.ts:16-23`
    - superadmin xoá / reset mật khẩu: `users.admin.service.ts:110-113, 148`
    - reset mật khẩu: `auth.service.ts:398`
  - Xoay vòng token không nguyên tử: tìm session ở `:307`, thu hồi ở `:344`.
- **Nguyên nhân**: một cột `revokedAt` mang hai nghĩa: "bị thu hồi" và "đã xoay vòng". Chỉ nghĩa thứ hai mới là dấu hiệu token bị đánh cắp.
- **Ảnh hưởng**:
  - Người dùng bấm "Đăng xuất thiết bị B" trên máy A. Lần sau B mở trang, backend thu hồi **toàn bộ** phiên, kể cả A, và gửi email "phát hiện đăng nhập bất thường" sai sự thật.
  - Vì SEC-02, chuyện này **lặp lại mỗi lần B tải trang**, tối đa 30 ngày.
  - Hai tab cùng refresh một lúc cũng có thể kích hoạt đúng nhánh này.
  - Tính năng "đổi mật khẩu chừa phiên hiện tại" (docs/12 BE-01) bị vô hiệu theo cùng cơ chế.
- **Hướng xử lý**:
  - Thêm cột `rotatedAt`, hoặc `revokedReason`, chỉ set khi xoay vòng.
  - Reuse detection chỉ xét token **đã xoay vòng**.
  - Cân nhắc *grace window* (cửa sổ khoan dung) vài giây cho refresh đồng thời.
- **Độ chắc chắn**: **Đã xác nhận** (logic tất định trong code). Nhánh 2 tab: Rủi ro tiềm ẩn.

#### SEC-03 · Chiếm trước tài khoản (*account pre-hijacking*)

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Bảo mật.
- **Bằng chứng**:
  - `auth.service.ts:137-151`: `register` tạo user **không** đặt `emailVerifiedAt`, không gửi mail xác minh.
  - `auth.service.ts:277-291`: `loginWithGoogle` tìm user theo email rồi `linkAuthAccount` vào tài khoản sẵn có.
  - `auth.service.ts:230-232`: `verifyMagicLink` đăng nhập vào tài khoản sẵn có theo email.
  - `emailVerifiedAt` không được kiểm ở bất kỳ đâu (grep).
- **Nguyên nhân**: tin rằng "email đã tồn tại thì thuộc về người đang chứng minh sở hữu email", nhưng tài khoản gốc chưa từng chứng minh sở hữu.
- **Ảnh hưởng**: kẻ tấn công đăng ký trước bằng email nạn nhân với mật khẩu của mình. Nạn nhân sau đó dùng Google hoặc magic link, và dữ liệu (địa chỉ, đơn hàng) nằm trong tài khoản mà kẻ tấn công vẫn đăng nhập được bằng mật khẩu.
- **Hướng xử lý**:
  - Bắt xác minh email trước khi cho đăng nhập bằng mật khẩu, hoặc khi liên kết Google/magic link vào tài khoản `emailVerifiedAt = null` thì:
    1. xoá `passwordHash`,
    2. thu hồi mọi phiên,
    3. đặt `emailVerifiedAt`.
- **Độ chắc chắn**: **Đã xác nhận** (luồng code). Khai thác đòi hỏi kẻ tấn công đăng ký trước nạn nhân.

#### SEC-04 · Backup DB có thể bị lộ công khai

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Bảo mật. docs/12 liên quan: OPS-02.
- **Bằng chứng**:
  - `backend/src/jobs/backupDatabase.job.ts:59-61`: thiếu `BACKUP_ENCRYPTION_PUBLIC_KEY` thì chỉ `logger.warn` rồi **vẫn upload bản rõ**.
  - `:66-71`: `cloudinary.uploader.upload(..., { resource_type: "raw", public_id: "backups/..." })`, không có `type: "private"/"authenticated"`. Delivery type mặc định `upload` là công khai.
  - `:37`: tên file `db-<ISO timestamp>.dump`, với cron chạy cố định lúc 03:00 (`jobs/index.ts`).
  - `env.ts:80`: `BACKUP_ENCRYPTION_PUBLIC_KEY` là optional; khối kiểm production `env.ts:97-114` không ép biến này. `docs/09:69` tự khuyến nghị "bắt buộc ở production".
  - `:22-28`: `pg_dump` nhận `DATABASE_URL` qua argv, nên mật khẩu DB hiện trong process list.
- **Nguyên nhân**: an toàn phụ thuộc vào việc người vận hành nhớ cấu hình, thay vì *fail-fast* (hỏng sớm).
- **Ảnh hưởng**: nếu production chưa đặt khoá, bản dump chứa PII khách hàng, hash mật khẩu và dữ liệu đơn hàng nằm ở URL công khai. Tên file có thể đoán được (cloud name lộ qua URL ảnh, thời điểm cố định, phần mili-giây có thể dò). Khi đó mức độ là **Critical**.
- **Hướng xử lý**:
  - `env.ts`: bắt buộc có khoá khi `NODE_ENV=production` và `RUN_JOBS=true`.
  - Upload với `type: "authenticated"`.
  - Dùng tài khoản Cloudinary riêng cho backup, như CHECKLIST.md:101 đã ghi.
  - Truyền mật khẩu qua `PGPASSWORD` thay vì argv.
- **Độ chắc chắn**: **Rủi ro tiềm ẩn**. Code cho phép, nhưng cấu hình production thực tế là **Chưa đủ dữ liệu**.

#### ERR-01 · Interceptor axios bỏ rơi request xếp hàng khi refresh thất bại

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Validation & xử lý lỗi.
- **Bằng chứng**:
  - `frontend/src/lib/axios.ts:12`: `let pendingQueue: Array<() => void>` chỉ có resolver.
  - `:27-29`: `pendingQueue.push(() => resolve(api(originalRequest)))`.
  - `:46`: `pendingQueue = [];` rồi `reject` **chỉ** request chính.
- **Nguyên nhân**: hàng đợi thiết kế cho nhánh thành công; nhánh thất bại bị bỏ quên. Test hiện có chỉ kiểm hàng đợi khi refresh thành công (`tests/unit/axios.test.ts:66-87`).
- **Ảnh hưởng**: đã **chạy thử với chính `axios.ts` + React Query** (24/09):
  - `refetchMe()` treo; query kẹt `status=success, fetchStatus=fetching` với user cũ.
  - Refetch khi focus lại tab cũng treo theo (React Query gộp vào promise đang treo).
  - Chỉ F5 mới thoát.
  - Xảy ra dễ ở trang login, nơi `Nav` và `refetchMe()` cùng gọi `/account/me`.
- **Hướng xử lý**: lưu `{ retry, fail }`; khi refresh lỗi thì gọi `fail()` cho từng request; bổ sung test "3 request cùng 401 + refresh 401".
- **Độ chắc chắn**: **Đã xác nhận** (tái hiện được).

#### FE-01 · Trạng thái phiên phía client không bị xoá khi phiên chết

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Kiến trúc frontend.
- **Bằng chứng**:
  - `frontend/src/components/layout/Nav.tsx:204, 287`: header render `UserMenu` khi `me` có dữ liệu.
  - `providers.tsx:8-15`: không có `QueryCache.onError`.
  - `axios.ts:42-47`: không phát tín hiệu hết phiên.
  - Cache chỉ bị xoá ở `useLogout` (`auth.hooks.ts:110`).
  - `AdminShell.tsx:74-75`: `refetchMe().then(r => r.data?.roles)`. Khi refetch lỗi, `r.data` vẫn là user cũ nên cổng vẫn mở.
- **Nguyên nhân**: React Query v5 **giữ `data` cũ khi refetch lỗi** (status `error` nhưng `data` không mất). Code giả định lỗi thì `data` rỗng.
- **Ảnh hưởng**: đúng lỗi người dùng báo. **Tái hiện bằng Playwright** (24/09): `/account/me` → 401, `/auth/refresh` → 401, nhưng header vẫn hiện "Super Admin"; chỉ F5 mới về "Đăng nhập".
- **Hướng xử lý**:
  - Khi refresh trả 401/403 thì đặt `['account','me'] = null`. Dùng `setQueryData`, vì `removeQueries` không báo cho component đang mount.
  - Nếu đang ở route cần đăng nhập thì đưa về `/login`.
  - AdminShell chỉ tin `result.isSuccess`.
- **Độ chắc chắn**: **Đã xác nhận**.

#### FE-02 · Luồng quay lại sau đăng nhập / tự phục hồi phiên bị sai

- **Nhãn / mức độ / nhóm**: `[NGUYÊN TẮC]` · High · Kiến trúc frontend. docs/12 liên quan: FE-08, đang ghi "✅ ĐÃ XỬ LÝ".
- **Bằng chứng**: 3 nguyên nhân chồng nhau.
  1. `login/page.tsx:39` và `auth.hooks.ts:36`: `useState(() => getRedirectTarget())`, trong khi `redirect.ts:10` đọc `window.location`. Khi điều hướng phía client, trang login render **trước khi** URL đổi. Log tái hiện: `window.location.search=""` → đích `"/"`.
  2. `login/page.tsx:55-61`: `if (me) router.replace(...)` chạy ngay với `me` cũ trong cache, không chờ `refetchMe()` (`:50-53`). `register/page.tsx:33-35` có cùng mẫu.
  3. Các trang `/account/*`, `/admin/*` là trang tĩnh, được Client Cache của Next giữ tới 5 phút (`staleTimes.static`). Kết quả "redirect về /login" bị cache lại, nên `router.push(target)` sau khi đăng nhập dùng lại redirect cũ.
- **Nguyên nhân**:
  - Đọc URL sai thời điểm.
  - Tin dữ liệu cache.
  - Chưa hiểu cơ chế Client Cache của App Router.
  - Cách "không tái hiện được bằng Playwright" ở docs/12 FE-08 là do kịch bản test dùng `page.goto`, tức tải lại trang cứng.
- **Ảnh hưởng**: **tái hiện được** (Playwright, 24/09): token hết hạn → bấm tab "Thiết bị đăng nhập" → thoáng qua `/login` → về `/`, header vẫn hiện user. Ở dạng (3), người dùng đứng im ở `/login` dù đã đăng nhập lại (trace network: `POST /login 200`, không có request nào tới trang đích).
- **Hướng xử lý**:
  - `useSearchParams()` bọc trong `<Suspense>`.
  - Chỉ điều hướng khi `isSuccess && isFetchedAfterMount`.
  - Dùng `window.location.replace(target)` sau khi trạng thái đăng nhập đổi (đồng thời xoá cache React Query/socket của phiên trước).
  - Mở lại mục FE-08 trong docs/12.
- **Độ chắc chắn**: **Đã xác nhận**.

### 🟡 Medium

#### ARCH-01 · Ranh giới core/domain bị rò

- `[NGUYÊN TẮC]` · Medium · Kiến trúc backend.
- **Bằng chứng**:
  - Core chứa code của domain:
    - `core/email/email.templates.ts:46` (`specialDateReminderTemplate`)
    - `src/jobs/sendSpecialDateReminders.job.ts:31` truy vấn `prisma.specialDate` từ tầng job dùng chung
    - `server.ts:7` import `modules/domain/orders/orders.realtime`
    - `domain/README.md:12` khẳng định xoá `domain/` là chạy được
  - Domain import sâu lẫn nhau:
    - `orders.service.ts:5` (`../coupons/coupons.service`)
    - `dashboard.service.ts:2` (`../orders/orders.validation`)
- **Nguyên nhân**: tính năng mới được thêm vào nơi tiện nhất tại thời điểm viết.
- **Ảnh hưởng**: mục tiêu "source base PERN tái sử dụng" (`docs/01 §1`) bị suy yếu, vì mang core sang dự án khác sẽ kéo theo code shop hoa.
- **Hướng xử lý**:
  - Chuyển template và job nhắc lịch vào `modules/domain/specialDates/`.
  - `server.ts` đăng ký realtime qua một hàm `registerDomainRealtime()` duy nhất.
  - Mỗi module domain export API công khai qua `index.ts`.
- **Độ chắc chắn**: Đã xác nhận.

#### ARCH-02 · Chưa sẵn sàng scale ngang dù tài liệu nói "an toàn"

- `[NGUYÊN TẮC]` · Medium · Kiến trúc backend.
- **Bằng chứng**:
  - `docker-compose.yml:32` có comment: "`--scale backend=3` — an toàn".
  - Toàn bộ `rateLimit(...)` dùng memory store mặc định (`auth.routes.ts:22-55`, `orders.routes.ts:14`...).
  - Socket.io không có adapter (`realtime.service.ts:15-21`); grep `adapter|redis` không thấy gì.
- **Ảnh hưởng**: khi scale, sự kiện đơn hàng realtime chỉ tới client cùng instance, và rate limit bị nhân theo số instance.
- **Hướng xử lý**: sửa comment ngay. Chỉ thêm Redis (adapter + rate-limit store) **khi** thật sự scale; hiện chưa cần (xem 08 · Không nên làm).
- **Độ chắc chắn**: Đã xác nhận (thiếu thành phần). Hậu quả là Rủi ro tiềm ẩn, vì hiện chạy 1 instance.

#### ARCH-03 · Thiết kế chặn route dựa trên access token 5 phút

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend (thiết kế xuyên hai phía).
- **Bằng chứng**:
  - `frontend/src/proxy.ts:18-21` chỉ xét cookie `access_token`.
  - `backend/src/modules/core/auth/cookie.util.ts:41-45` đặt `maxAge` của cookie đúng bằng TTL của JWT (5 phút), nên trình duyệt tự xoá cookie.
  - `refresh_token` có path `/api/v1`, nằm ở domain API nên proxy không nhìn thấy.
  - `Nav.tsx:204` gọi `useMe()` ở mọi trang công khai.
- **Ảnh hưởng**:
  - Mọi phiên nhàn rỗi >5 phút, khi bấm sang trang cần đăng nhập, đều bị đẩy qua `/login` rồi mới tự phục hồi. Đây là điều kiện kích hoạt FE-01/FE-02.
  - Khách vãng lai tốn 2 request thừa mỗi lần tải trang (`/me` 401 + `/refresh` 401).
- **Hướng xử lý** (chọn một):
  - (a) Backend đặt thêm cookie gợi ý `has_session=1`, không httpOnly, không chứa bí mật, sống theo TTL của refresh token; proxy dựa vào đó để quyết định.
  - (b) Frontend refresh chủ động trước khi hết hạn.
  - Kèm theo: chỉ gọi `useMe` ở trang công khai khi có cookie gợi ý.
- **Độ chắc chắn**: Đã xác nhận (quan sát được khi tái hiện: sau TTL chỉ còn cookie `refresh_token`).

#### BE-01 · Backend dùng CommonJS

- `[CHUẨN]` · Medium · Kiến trúc backend.
- **Bằng chứng**: `backend/tsconfig.json:5-6` (`"module": "CommonJS"`, `"moduleResolution": "Node"`); `backend/package.json` không có `"type"`. Không còn lời gọi `require(` nào trong `src`.
- **Ảnh hưởng**: lệch chuẩn ESM của khoá học; `moduleResolution: Node` là chế độ cũ (node10).
- **Hướng xử lý**: chuyển sang `NodeNext` (import tương đối thêm `.js`). Đây là cơ hội nâng cấp, không gấp. Vitest đã hỗ trợ ESM sẵn.
- **Độ chắc chắn**: Đã xác nhận.

#### BE-02 · Định dạng lỗi và mã lỗi chưa chuẩn hoá

- `[CHUẨN]` · Medium · Kiến trúc backend.
- **Bằng chứng**:
  - Lỗi thường có dạng phẳng `{ success:false, message, code }` (`errorHandler.ts:46`).
  - Lỗi validate lại có dạng `{ success:false, message, errors }` và **không có `code`** (`:35`), dù `ValidationError` có code (`ValidationError.ts:10`).
  - Có 111 lời gọi `new AppError(` dùng chuỗi literal; `NOT_FOUND` bị dùng lại khoảng 38 lần. Cùng một tình huống "không tìm thấy sản phẩm" lúc là `NOT_FOUND` (`products.service.ts:230`), lúc là `PRODUCT_NOT_FOUND` (`wishlist.service.ts:36`).
- **Hướng xử lý**:
  - Tạo `shared/errors/errorCodes.ts`.
  - Thống nhất shape `error: { code, message, details[] }`, đồng thời cập nhật frontend `lib/errors.ts`.
- **Độ chắc chắn**: Đã xác nhận.

#### SEC-02 · Refresh thất bại không xoá cookie

- `[NGUYÊN TẮC]` · Medium · Bảo mật.
- **Bằng chứng**: `auth.controller.ts:55-58` không có nhánh lỗi; `clearAuthCookies` chỉ được gọi ở `logout` (`:62`).
- **Ảnh hưởng**: trình duyệt gửi lại refresh token chết ở mọi lần tải trang (quan sát được khi tái hiện: cookie `refresh_token` còn nguyên sau khi refresh trả 401). Kết hợp với SEC-01 thì mỗi lần gửi lại là một lần thu hồi toàn bộ phiên và gửi email.
- **Hướng xử lý**: bắt `AppError` 401/403 để `clearAuthCookies` rồi ném tiếp. Lỗi 500 thì giữ cookie.
- **Độ chắc chắn**: Đã xác nhận.

#### SEC-05 · Module files tin dữ liệu client quá mức

- `[NGUYÊN TẮC]` · Medium · Bảo mật.
- **Bằng chứng**:
  - `files.routes.ts:15-16`: presign/create chỉ cần đăng nhập.
  - `files.service.ts:56-69`: `createFileRecord` tra `input.publicId` do client gửi, **không** kiểm tiền tố `uploads/` mà server đã cấp. Nếu asset lớn hơn 10MB thì `purgeFileFromCloudinary(input.publicId)`.
  - `files.service.ts:113-123`: `setEntityFile` không kiểm `uploadedBy` và MIME. `users.service.ts:32-40` dùng hàm này cho avatar.
  - Presign không có rate limit. File đã upload lên Cloudinary nhưng không gọi `POST /files` thì không bao giờ được dọn (`cleanupOrphanFiles.job.ts:11-21` chỉ quét DB).
- **Ảnh hưởng**:
  - Member bất kỳ biết `publicId` có thể khiến server xoá ảnh >10MB trên Cloudinary.
  - Có thể "nhận" ảnh sản phẩm hoặc file của người khác làm avatar.
  - Có thể lạm dụng dung lượng Cloudinary.
- **Hướng xử lý**:
  - Kiểm `publicId.startsWith("uploads/")`, và lý tưởng là đối chiếu với presign đã cấp.
  - `setEntityFile` kiểm `uploadedBy === userId` và `mimeType` ảnh.
  - Thêm rate limit cho presign.
- **Độ chắc chắn**: Đã xác nhận (luồng code).

#### SEC-06 · Thiếu rate limit ở một số endpoint nhạy cảm

- `[NGUYÊN TẮC]` · Medium · Bảo mật.
- **Bằng chứng**:
  - Không có limiter:
    - `auth.routes.ts:72-76` (`/magic-link/verify`) và `:83` (`/refresh`)
    - `coupons.routes.ts:10` (`/coupons/validate`): trả mã khác nhau `COUPON_NOT_FOUND`/`INACTIVE`/`EXPIRED` (`coupons.service.ts:42-51`), nên là "oracle" để dò mã
    - `orders.routes.ts:34` (tra đơn)
    - `files.routes.ts:15` (presign)
    - `users.routes.ts:15-19` (đổi mật khẩu)
  - Limiter của contact, newsletter và order không có `skip: env.disableRateLimit`, không đồng nhất với nhóm auth.
  - `DISABLE_RATE_LIMIT=true` không bị chặn ở production (`env.ts:97-114`).
- **Hướng xử lý**: thêm limiter; đưa khởi tạo limiter về một factory dùng chung (xem CODE-02); fail-fast nếu cờ tắt limiter được bật ở production.
- **Độ chắc chắn**: Đã xác nhận.

#### SEC-07 · Dữ liệu seed và mật khẩu mặc định có thể lọt vào production

- `[NGUYÊN TẮC]` · Medium · Bảo mật.
- **Bằng chứng**:
  - `backend/prisma/seed/core.seed.ts:144` có mật khẩu fallback hard-code (biến `password`); `:159-161` in mật khẩu ra console.
  - Cùng giá trị mặc định lặp lại ở `README.md:54`, `backend/README.md:64`, `backend/.env.example:236`, `frontend/e2e/fixtures.ts:7`. Báo cáo này không chép giá trị.
  - `domain.seed.ts:203-206` tạo coupon mẫu, trong đó có mã 10% không giới hạn lượt; `docs/10:346-347` hướng dẫn chạy `seed:domain` ở production.
  - Không có cờ bắt đổi mật khẩu ở lần đăng nhập đầu.
- **Hướng xử lý**:
  - Tách seed permission/role (cần cho production) khỏi seed dữ liệu mẫu (chặn khi `NODE_ENV=production`).
  - Không in mật khẩu ra console.
  - Production bắt buộc đặt `SUPER_ADMIN_PASSWORD`.
- **Độ chắc chắn**: Đã xác nhận (code và docs). Việc production đã chạy seed mẫu hay chưa: Chưa đủ dữ liệu.

#### DB-01 · Trạng thái dạng chuỗi tự do

- `[NGUYÊN TẮC]` · Medium · Database.
- **Bằng chứng**: `schema.prisma` không có `enum` nào. Các cột `User.status` (`:23`), `Order.status` (`:417`), `paymentMethod` (`:418`), `deliveryTimeSlot` (`:431`), `Coupon.type` (`:551`), `EmailLog.type/status` (`:254-255`) đều là `String`, giá trị hợp lệ chỉ nằm trong comment.
- **Ảnh hưởng**: DB không tự bảo vệ; sai chính tả trong seed/script hoặc thao tác DB tay sẽ tạo trạng thái "ma".
- **Hướng xử lý**: Prisma `enum` (migration có kiểm soát) hoặc CHECK constraint qua migration SQL.
- **Độ chắc chắn**: Đã xác nhận.

#### DB-02 · Xung đột slug với sản phẩm đã xoá mềm

- `[NGUYÊN TẮC]` · Medium · Database.
- **Bằng chứng**:
  - `products.service.ts:85-87`: `findFirst({ where: { slug, deletedAt: null } })`.
  - `migrations/20260910120000_add_products/migration.sql:30`: `products_slug_key` là unique index áp lên mọi bản ghi.
  - `blog.service.ts:37-39` không lọc `deletedAt`, nên không dính lỗi này. Đây là minh chứng cho việc các bản sao `ensureUniqueSlug` đã lệch nhau (CODE-02).
- **Ảnh hưởng**: tạo lại sản phẩm trùng tên với sản phẩm đã xoá → `409 DUPLICATE` khó hiểu.
- **Hướng xử lý**: bỏ `deletedAt: null` trong lúc kiểm trùng, hoặc dùng partial unique index `WHERE deleted_at IS NULL`.
- **Độ chắc chắn**: Đã xác nhận (đọc code và migration).

#### DB-03 · Thao tác nhiều bước không dùng transaction

- `[NGUYÊN TẮC]` · Medium · Database.
- **Bằng chứng**:
  - Cả `src` chỉ có 3 `$transaction`.
  - `products.service.ts:242-256, 294-310`: ghi sản phẩm → ảnh → biến thể → dịp lễ tuần tự; `replaceOccasions` validate id **sau khi** đã tạo sản phẩm (`:157-165`).
  - `addresses.service.ts:34-56`: đếm → `updateMany` → `create`.
  - Các chỗ khác: `files.service.ts:121-122`, `users.admin.service.ts:102-113`, `auth.service.ts:280-291`.
- **Ảnh hưởng**: occasion sai → trả 404 nhưng sản phẩm dở dang đã được tạo; request đồng thời có thể tạo 2 địa chỉ mặc định.
- **Hướng xử lý**: validate toàn bộ id trước khi ghi, rồi gói phần ghi vào `$transaction`.
- **Độ chắc chắn**: Đã xác nhận.

#### DB-04 · Job dọn file có thể xoá file đang được dùng

- `[NGUYÊN TẮC]` · Medium · Database.
- **Bằng chứng**:
  - `files.service.ts:167-171` xoá mềm file mà không kiểm `usages`.
  - `cleanupOrphanFiles.job.ts:17` chọn file `deletedAt < cutoff`; `:26` purge Cloudinary **trước**, `:27` mới `prisma.file.delete`, bước này bị FK `RESTRICT` từ `ProductImage` chặn.
- **Ảnh hưởng**: ảnh sản phẩm mất vĩnh viễn trên Cloudinary trong khi DB vẫn trỏ tới URL chết.
- **Hướng xử lý**: chặn xoá file đang có usage (409); job xoá DB trước, thành công rồi mới purge.
- **Độ chắc chắn**: Đã xác nhận luồng code. Tần suất xảy ra là Rủi ro tiềm ẩn (cần admin xoá nhầm ở màn tài nguyên).

#### VAL-01 · Cập nhật coupon một phần làm tổng đơn âm

- `[NGUYÊN TẮC]` · Medium · Validation & xử lý lỗi.
- **Bằng chứng**:
  - `coupons.validation.ts:47-52`: `refine(v => v.type !== "percent" || v.value === undefined || v.value <= 100)` chỉ đúng khi `type` có trong cùng payload.
  - `coupons.service.ts:141-156` ghi thẳng dữ liệu.
  - `computeDiscount` (`:32`) không kẹp mức giảm với loại percent.
  - `orders.service.ts:222`: `total: subtotal - discountAmount`.
- **Ví dụ**: PATCH `{ value: 500 }` vào mã **đang** là percent sẽ lọt qua; hoặc PATCH `{ type: "percent" }` vào mã fixed 50.000. Nhánh update cũng không kiểm `endDate > startDate`.
- **Ảnh hưởng**: đơn hàng có tổng âm; báo cáo doanh thu sai.
- **Hướng xử lý**: service merge với bản ghi hiện tại rồi validate lại bằng schema đầy đủ; `computeDiscount` luôn `Math.min(..., subtotal)`.
- **Độ chắc chắn**: Đã xác nhận (đọc code). Cần quyền `promotions.manage` để kích hoạt.

#### VAL-03 · Form frontend chưa thống nhất RHF + zod

- `[CHUẨN]` · Medium · Validation & xử lý lỗi.
- **Bằng chứng**:
  - RHF + zod chỉ có ở 7 form: 5 trang auth và 2 form hồ sơ.
  - Tự quản bằng `useState`:
    - `thanh-toan/page.tsx` (form doanh thu chính)
    - `ContactPageView.tsx`, `NewsletterSignupForm.tsx`
    - 9 trang CRUD admin/account, không có thẻ `<form>` (nên cũng không Enter-to-submit)
  - `setError` của RHF không được dùng ở đâu; chỉ `thanh-toan:157-160` và `ContactPageView:117-121` map lỗi 422 bằng tay.
  - 3 form `type="email"` thiếu `noValidate`: `login:71-75`, `magic-link:35-39`, `forgot-password:32-36`. Chính `register/page.tsx:46-50` đã ghi lại lỗi này.
- **Ảnh hưởng**: lệch quy ước của chính dự án (`docs/04-frontend.md:276`); form checkout không có validate phía client.
- **Hướng xử lý**: làm dần theo feature, bắt đầu từ checkout: `orders.schemas.ts` + RHF + `setError` từ `errors`.
- **Độ chắc chắn**: Đã xác nhận.

#### ERR-02 · Lỗi parse body trả 500

- `[NGUYÊN TẮC]` · Medium · Validation & xử lý lỗi.
- **Bằng chứng**: `errorHandler.ts` chỉ xử lý `ValidationError`, `AppError` và `PrismaClientKnownRequestError`. `SyntaxError` của `express.json` (`type: "entity.parse.failed"`, status 400) và lỗi `entity.too.large` (413) đều rơi vào nhánh 500 (`:62-69`), kèm `log.error`. Không có guard `res.headersSent`.
- **Ảnh hưởng**: client gửi JSON sai nhận 500; log và cảnh báo trên Loki bị nhiễu bởi "lỗi hệ thống" giả.
- **Hướng xử lý**: map lỗi theo `err.type` / `err.status` của body-parser sang 400/413.
- **Độ chắc chắn**: Đã xác nhận (đọc code).

#### ERR-03 · Log lỗi 500 có thể mất message/stack

- `[NGUYÊN TẮC]` · Medium · Validation & xử lý lỗi.
- **Bằng chứng**: `shared/logger/logger.ts:23-26` gói tham số thừa vào `{ detail: extra }`; `errorHandler.ts:64` gọi `log.error("Unhandled error:", err)`. Serializer lỗi của pino chỉ áp cho key `err`. `Error` nằm ở key khác thường bị stringify thành `{}`, vì `message` và `stack` không phải thuộc tính enumerable.
- **Ảnh hưởng**: đúng lúc cần điều tra lỗi 500 nhất thì log production thiếu stack.
- **Hướng xử lý**: nếu tham số là `Error` thì log `{ err }`; thêm test kiểm output JSON.
- **Độ chắc chắn**: **Rủi ro tiềm ẩn** (suy luận từ cơ chế pino, chưa chạy thử).

#### ERR-04 · Xử lý lỗi cấp tiến trình và shutdown chưa đủ

- `[NGUYÊN TẮC]` · Medium · Validation & xử lý lỗi.
- **Bằng chứng**:
  - `server.ts` không có `unhandledRejection`/`uncaughtException`, không có `server.on("error")`.
  - `jobs/index.ts:12-16`: `cron.schedule(..., () => cleanupExpiredTokens())` không có `.catch`.
  - `shutdown` (`:32-45`) không gọi `io.close()`, nên các websocket đang mở giữ `server.close` lại.
- **Ảnh hưởng**: rejection trong cron không được log có cấu trúc; mỗi lần deploy đều phải chờ 10s rồi `exit(1)`.
- **Hướng xử lý**: thêm handler cấp tiến trình (log rồi thoát có kiểm soát), `.catch` cho mọi job, `io.close()` trước `server.close()`.
- **Độ chắc chắn**: Đã xác nhận việc thiếu handler; việc luôn phải force exit là Rủi ro tiềm ẩn.

#### ERR-05 · Quy tắc nghiệp vụ đơn hàng còn hở

- `[NGUYÊN TẮC]` · Medium · Validation & xử lý lỗi (logic nghiệp vụ).
- **Bằng chứng**:
  - `orders.service.ts:145-152`: `unitPrice = variant ? variant.price : product.basePrice`. Sản phẩm có biến thể mà client bỏ `variantId` vẫn được đặt theo `basePrice`, và `basePrice` độc lập với giá biến thể (`products.validation.ts:17`).
  - `updateStatus` (`:333-395`) không hoàn lại `usedCount` của coupon khi huỷ đơn. Đơn guest (10 đơn/15 phút/IP) có thể tiêu hết mã giới hạn lượt.
  - `generateOrderCode` (`:68-77`) nằm ngoài transaction: kiểm-rồi-ghi trong vòng `for(;;)`; va chạm thì trả `409 DUPLICATE` cho khách.
  - Không có máy trạng thái: chỉ chặn trạng thái cuối, còn `pending → completed` hay `delivering → pending` đều được phép.
- **Hướng xử lý**:
  - Bắt buộc `variantId` khi sản phẩm có biến thể.
  - Bảng `ALLOWED_TRANSITIONS`.
  - Hoàn lượt coupon khi huỷ.
  - Sinh mã đơn trong transaction và retry khi gặp P2002.
- **Độ chắc chắn**: Đã xác nhận (đọc code). Tác động giảm nhờ bước gọi điện xác minh đơn COD.

#### FE-03 · Trang admin "béo", khung CRUD bị copy-paste

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend (DRY/SRP).
- **Bằng chứng**:
  - 9 trang cùng khung state `creating/createForm/editingId/editForm` + `toInput`/`emptyForm`: `admin/{products,categories,blog,coupons,occasions}`, `superadmin/{roles,permissions}`, `account/{addresses,special-dates}`.
  - Form tạo và form sửa bị nhân đôi inline: `categories:168-291` với `:369-505`; `occasions:96-135` với `:190-230`; `permissions:92-129` với `:189-216`; `roles:95-140` với `:211-235`.
  - Class input lặp 60 lần, class label lặp 69 lần.
  - Chính `site-content/page.tsx:18` ghi "UI copy khuôn từ superadmin/settings".
- **Hướng xử lý**:
  - Tách `features/<x>/components/<X>Form.tsx`.
  - Tạo primitive `Input`/`Select`/`Field`.
  - Hook `useCrudPage` **chỉ khi** đã tách xong 3 trang đầu (rule-of-three, tránh trừu tượng hoá sớm).
- **Độ chắc chắn**: Đã xác nhận.

#### FE-04 · Lỗi query không được hiển thị

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend.
- **Bằng chứng**:
  - `admin/products/page.tsx:449-452`: `isLoading ? … : products.length === 0 ? "Chưa có sản phẩm nào." : …`.
  - Trong `src/app`, `isError` chỉ xuất hiện ở các trang auth và `thanh-toan`; không có trang danh sách admin/account nào.
  - `account/profile/page.tsx:37`: `if (isLoading || !me)` hiện "Đang tải..." mãi khi `useMe` lỗi.
- **Ảnh hưởng**: API lỗi (500, 403) hiển thị thành "chưa có dữ liệu". Admin có thể tưởng mất dữ liệu, hoặc tạo trùng.
- **Hướng xử lý**: component `QueryState` (loading / error + thử lại / empty) dùng chung.
- **Độ chắc chắn**: Đã xác nhận.

#### FE-05 · Types trùng lặp, không tập trung

- `[CHUẨN]` · Medium · Kiến trúc frontend.
- **Bằng chứng**:
  - `PaginationMeta` khai báo 10 lần (`contact.service.ts:20`, `blog.service.ts:26`, `coupons.service.ts:32`...).
  - `Category`/`StorefrontCategory`/`NavCategory`/`FooterCategory` (`Nav.tsx:11`, `Footer.tsx:7`).
  - `Product` với `StorefrontProduct` (`storefront-api.ts:24`).
  - `LoginMethod` khai báo 3 lần (`auth.service.ts:11`, `loginMethods.service.ts:3`, inline ở `login/page.tsx:17`).
  - 38 hàm service trả `AxiosResponse<any>` (không generic).
  - Shape trả về không nhất quán: `{items, meta}`, `{data, meta}` và mảng/entity trần.
- **Hướng xử lý**:
  - `src/types/api.ts` (`ApiResponse<T>`, `Paginated<T>`).
  - Mỗi feature một `types.ts`.
  - Service luôn unwrap về cùng một dạng.
- **Độ chắc chắn**: Đã xác nhận.

#### FE-06 · Mutation không invalidate dữ liệu liên quan

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend.
- **Bằng chứng**:
  - `useChangePassword` (`account.hooks.ts:27-34`) không invalidate `['account','sessions']`, trong khi backend đã thu hồi các phiên khác.
  - Mutation role (`roles.hooks.ts:17-55`) không invalidate `['admin','users']`/`['account','me']`.
  - `useUpdateOrderStatus` (`orders.hooks.ts:28-31`) không invalidate dashboard.
  - Occasion không invalidate products; files không invalidate folders; moderate review không invalidate `['reviews','product',id]`.
  - `useUpdateLoginMethod` không invalidate `['auth','login-methods']`.
- **Hướng xử lý**: dùng key factory (FE-07) và ghi rõ các phụ thuộc chéo ngay trong hook.
- **Độ chắc chắn**: Đã xác nhận.

#### FE-08 · Accessibility (a11y) yếu ở admin và checkout

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend.
- **Bằng chứng**:
  - Khoảng 89 `<label>` nhưng chỉ 13 có `htmlFor`. Ví dụ `thanh-toan/page.tsx:185, 206, 219...` có 8 label không gắn control.
  - `div onClick`: `admin/resources/page.tsx:44-46, 189-190`.
  - `<Link><Button/></Link>` (phần tử tương tác lồng nhau): `error.tsx:37-39`, `not-found.tsx:21-23`, `403/page.tsx:21-23`, `login/page.tsx:103-107`.
  - `ConfirmDialog.tsx:13-14` không có `role="dialog"`/`aria-modal`/focus trap/Esc.
  - `Toaster.tsx:13` không có `aria-live`.
  - `UserMenu.tsx:37` thiếu `aria-expanded`.
  - Nút toggle không có `aria-pressed`.
  - Nút xoá chỉ hiện khi hover (`resources/page.tsx:349`).
  - ESLint không bật `jsx-a11y/recommended`.
- **Hướng xử lý**:
  - Dùng `FormField` (đã gắn `htmlFor` đúng) ở mọi form.
  - Bổ sung thuộc tính ARIA cho dialog và toast.
  - Bật plugin a11y để lint giữ chất lượng.
- **Độ chắc chắn**: Đã xác nhận.

#### FE-09 · Thao tác phá huỷ không hỏi xác nhận

- `[NGUYÊN TẮC]` · Medium · Kiến trúc frontend.
- **Bằng chứng**:
  - "Huỷ đơn": `admin/orders/page.tsx:257-263` gọi thẳng `updateStatus.mutate({ status: 'cancelled' })`. Huỷ là trạng thái cuối, không hoàn tác được.
  - Khoá user, reset mật khẩu, đổi role qua `onChange` của select: `superadmin/users/page.tsx:96-142`.
  - Thu hồi phiên: `account/devices/page.tsx:21-57`.
- **Ảnh hưởng**: bấm nhầm là mất đơn hoặc khoá nhầm người. Trái quy ước `docs/04:279`.
- **Hướng xử lý**: bọc bằng `confirmDialog` sẵn có.
- **Độ chắc chắn**: Đã xác nhận.

#### CODE-01 · Log DEBUG tạm thời bị commit lên `main`

- `[NGUYÊN TẮC]` · Medium · Clean code.
- **Bằng chứng**: commit `bdf8d99` "WIP: temporary debug logging" nằm trên `main`.
  - `proxy.ts:24-26, 41, 53` log ở server, **mỗi request** khớp matcher.
  - `redirect.ts:7, 14-17` còn tạo `new Error('stack').stack` ở mỗi lần gọi.
  - `login/page.tsx:41, 58` log object `me` (email, roles, permissions) ra console trình duyệt ở **mọi lần render**.
  - Các comment `eslint-disable-next-line no-console` vô tác dụng vì không có rule `no-console`.
- **Hướng xử lý**:
  - Xoá log.
  - Thêm `no-console: error` (cho phép `console.error` ở error boundary).
  - Log chẩn đoán nên nằm ở nhánh riêng, không merge.
- **Độ chắc chắn**: Đã xác nhận.

#### CODE-02 · Lặp code backend vượt ngưỡng rule-of-three

- `[NGUYÊN TẮC]` · Medium · Clean code.
- **Bằng chứng**:
  - `ensureUniqueSlug` ×4 (`categories:28-39`, `products:81-92`, `blog:33-44`, `occasions:23-34`), đã lệch nhau và sinh ra DB-02.
  - `assertNoCycle` ×2 (`folders.service.ts:16` tự ghi "Giống hệt").
  - Kiểm coupon ×2 (`coupons.service.ts:40-64`, `orders.service.ts:177-197`).
  - Trích token ×3 (`authenticate.ts:16-18`, `attachUserIfPresent.ts:11-13`, `orders.realtime.ts:17-31`).
  - Thu hồi session ×3.
  - Phân trang khoảng 15 chỗ; cấu hình `rateLimit` ×6.
- **Lưu ý sư phạm**: `products.service.ts:79-80` có comment bênh vực việc lặp. Lặp có chủ đích là hợp lý dưới 3 lần; ở đây đã 4 lần và **đã gây bug**.
- **Hướng xử lý**: `shared/utils/{slug,pagination,tree}.ts`, `shared/middleware/rateLimiters.ts`.
- **Độ chắc chắn**: Đã xác nhận.

#### CODE-03 · `orders.service.create` ôm quá nhiều trách nhiệm

- `[NGUYÊN TẮC]` · Medium · Clean code (SRP).
- **Bằng chứng**: `orders.service.ts:82-268` dài 187 dòng, gồm honeypot, gộp item, tính giá, coupon, transaction, audit và emit realtime.
- **Hướng xử lý**: tách `normalizeItems`, `priceItems`, `applyCoupon(tx)`, `persistOrder(tx)`; mỗi hàm có unit test riêng.
- **Độ chắc chắn**: Đã xác nhận.

#### TEST-01 · Luồng phiên phía client không có test

- `[NGUYÊN TẮC]` · Medium · Kiểm thử.
- **Bằng chứng**:
  - `tests/unit/axios.test.ts:89-94` chỉ kiểm 1 request khi refresh thất bại.
  - `hooks.test.tsx:68-92` không kiểm `useMe` sau khi phiên chết.
  - `vitest.config.ts:22` loại trừ `src/app/**` khỏi coverage; không có test trang login.
  - Mọi E2E điều hướng bằng `page.goto` (`auth.spec.ts:70-86`, `fixtures.ts:17`), không có kịch bản bấm Link sau khi token hết hạn.
- **Ảnh hưởng**: FE-01, FE-02 và ERR-01 lọt qua cả unit, integration lẫn E2E.
- **Hướng xử lý**:
  - Unit: 3 request cùng 401 + refresh 401 → cả 3 phải reject.
  - Component test: Nav khi phiên chết.
  - E2E: xoá cookie `access_token` → bấm Link.
- **Độ chắc chắn**: Đã xác nhận.

#### TEST-02 · Test "khoá" hành vi sai; mock che rủi ro transaction

- `[NGUYÊN TẮC]` · Medium · Kiểm thử.
- **Bằng chứng**:
  - `auth.service.test.ts:678-766` mock `revokedAt: new Date()` mà không phân biệt lý do, tức khẳng định đúng hành vi của SEC-01 là "đúng".
  - `tests/mocks/prisma.mock.ts:27-29`: `$transaction` chỉ gọi callback, không mô phỏng rollback.
  - DB test thật chỉ có 6 case (`tests/db/constraints`, `migrations`).
- **Hướng xử lý**:
  - Test phân biệt "thu hồi hợp lệ" với "đã xoay vòng".
  - Thêm DB test (Testcontainers đã có sẵn) cho race coupon và rollback đặt hàng.
- **Độ chắc chắn**: Đã xác nhận.

#### DOC-01 · Quick start frontend tham chiếu file không tồn tại

- `[NGUYÊN TẮC]` · Medium · Tài liệu.
- **Bằng chứng**:
  - `README.md:49`, `frontend/README.md:13`, `CLAUDE.md:202` và `docs/09:7` đều dùng `cp .env.local.example .env.local`, nhưng tại `bdf8d99` file này không tồn tại (`git ls-tree` chỉ có `.env.example` và `backend/.env.example`).
  - `frontend/.gitignore:34` (`.env*`) cũng sẽ chặn file example.
- **Hướng xử lý**: tạo `frontend/.env.example` với mô tả từng biến theo mẫu CLAUDE.md §4; thêm `!.env.example` vào `.gitignore`.
- **Độ chắc chắn**: Đã xác nhận.

#### DOC-02 · Tài liệu lệch code ở nhiều nơi

- `[NGUYÊN TẮC]` · Medium · Tài liệu.
- **Bằng chứng**:
  - `README.md`:
    - `:62-63` ghi 334/101 test, trong khi thực tế khoảng 929/149;
    - `:129` ghi Phase 7 "Docker, CI/CD ⬜".
  - `backend/README.md`: `:86` ghi cron chỉ cần `NODE_ENV`; `:87` ghi "trust proxy chưa có", trong khi `app.ts:19` đã có.
  - `frontend/README.md:84` liệt kê trang "chưa làm" nhưng các trang đó đều đã có.
  - `docs/01 §3.2` ghi đơn hàng/đánh giá/khuyến mãi/blog/nhắc lịch/realtime là ⬜ dù code đã có.
  - `docs/modules/core-auth.md`:
    - `:98-101` ghi "CHƯA có reuse detection";
    - `:105-106` ghi đổi mật khẩu không thu hồi phiên;
    - `:186-190` mô tả luồng `setUser` vào Zustand;
    - `:211-216` liệt kê BE-01…BE-17 là còn lại.
  - `docs/12`:
    - `:829` ghi FE-08 "✅ ĐÃ XỬ LÝ", trong khi lỗi còn và log debug còn;
    - "không còn khoản nợ nào đang mở" trong khi FE-07 vẫn ⬜.
  - `docker-compose.yml`: `:32` ghi "scale an toàn"; `:60` ghi "chờ migrate" nhưng dùng `service_started`.
- **Nguyên nhân**: tài liệu nhiều và chi tiết nhưng không có cơ chế buộc cập nhật (checklist PR, CI kiểm).
- **Hướng xử lý**: bỏ các con số dễ lỗi thời (số test) khỏi README; thêm mục "docs cập nhật?" vào PR template; rà lại danh sách trên.
- **Độ chắc chắn**: Đã xác nhận.

#### OPS-01 · Quy trình đưa code vào nhánh chính chưa có cổng chặn

- `[NGUYÊN TẮC]` · Medium · Vận hành.
- **Bằng chứng**:
  - `git log`: `bdf8d99` (WIP debug) nằm trên `main`; `main` và `review` trùng nhau.
  - `CHECKLIST.md:141`: "Branch protection CHƯA bật".
  - `.github/workflows/ci.yml:83-86`: job `e2e` chỉ chạy khi push vào `main`, tức sau khi đã merge.
  - Backend không có bước `npm run build` trên PR.
- **Hướng xử lý**:
  - Bật branch protection (bắt buộc CI xanh + review).
  - Làm việc trên nhánh tính năng.
  - E2E (ít nhất luồng auth) chạy trên PR.
  - Thêm bước build backend.
- **Độ chắc chắn**: Đã xác nhận.

### 🟢 Low

Mỗi mục ghi đủ các trường ở dạng rút gọn.

- **BE-03** · `[NGUYÊN TẮC]` · Low · Backend. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `routes/v1/index.ts:43` mount `"/account", authenticate`; các path con `/account/orders` (`:46`), `addresses` (`:49`)... khớp cả prefix này và mount `authenticate` lần nữa.
  - **Ảnh hưởng**: mỗi request thực hiện 2 lần verify JWT và 2 lần truy vấn quyền.
  - **Hướng xử lý**: mount `usersRouter` sau các subrouter, hoặc bỏ `authenticate` ở các subrouter.
- **SEC-08** · `[NGUYÊN TẮC]` · Low · Bảo mật. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `ORDER_SELECT` công khai có `userId: true` (`orders.service.ts:24`); `orders.realtime.ts:57-61` cho join room bằng chuỗi bất kỳ; `newsletter.service.ts:31-40` cho huỷ đăng ký không cần token; trang `don-hang/[id]` (có tên, SĐT người nhận) không có `robots: noindex`.
  - **Hướng xử lý**: tách select công khai; kiểm UUID khi join; token huỷ đăng ký; noindex.
- **SEC-09** · `[NGUYÊN TẮC]` · Low · Bảo mật. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**:
    - `orders.admin.routes.ts:41-45` không có `authorize`.
    - `orders.service.ts:340-349` trả 404/409 trước khi kiểm quyền ở `:351-360`, nên member dò được đơn tồn tại/đã kết thúc.
    - `authenticate.ts:25-35` không kiểm `status`/`deletedAt`; `setBlocked` không thu hồi phiên, nên user bị khoá còn dùng được tới 5 phút.
  - **Hướng xử lý**: `authorize` "một trong các quyền" ở route; thu hồi phiên khi khoá.
- **SEC-10** · `[NGUYÊN TẮC]` · Low · Bảo mật. **Độ chắc chắn**: Đã xác nhận (code); timing là Rủi ro tiềm ẩn.
  - **Bằng chứng**: `auth.validation.ts:7, 13` không `.toLowerCase()`, nên có thể tồn tại `A@x.com` và `a@x.com` song song; `auth.service.ts:156-157` trả sớm trước bcrypt khi email không tồn tại (timing oracle).
  - **Hướng xử lý**: chuẩn hoá email ở schema; so sánh với hash giả.
- **SEC-11** · `[NGUYÊN TẮC]` · Low · Bảo mật. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `/docs`, `/openapi.json` công khai mọi môi trường (`app.ts:32`); `cookieParser(secret)` nhưng không dùng signed cookie (`app.ts:25`); `jwt.verify` không pin `algorithms` (`jwt.ts:19`); `JWT_REFRESH_SECRET` bắt buộc nhưng không dùng; `requestId` echo header không giới hạn độ dài; Caddyfile không có CSP.
  - **Hướng xử lý**: guard theo môi trường, pin `HS256`, bỏ biến thừa, thêm CSP.
- **SEC-12** · `[NGUYÊN TẮC]` · Low · Bảo mật. **Độ chắc chắn**: Rủi ro tiềm ẩn.
  - **Bằng chứng**: `dangerouslySetInnerHTML` ở `blog/[slug]/page.tsx:79`, `san-pham/[slug]/page.tsx:111`; frontend chỉ dựa vào sanitize lúc ghi (`sanitizeHtml.ts`); `categories.service.ts:106` không sanitize `description`.
  - **Hướng xử lý**: sanitize thống nhất ở mọi nơi ghi; CSP làm lớp phòng thủ bổ sung.
- **DB-05** · `[NGUYÊN TẮC]` · Low · Database. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: thiếu index cho `orders.created_at` (dùng trong `orderBy` ở `orders.service.ts:288, 306, 319`), các cột `expires_at` (job dọn dẹp lọc theo), `email_logs`, `reviews.user_id`, `product_images.file_id`, `categories.parent_id`, `users.deleted_at`.
  - **Hướng xử lý**: thêm index theo truy vấn thật, đo bằng `EXPLAIN`.
- **DB-06** · `[NGUYÊN TẮC]` · Low · Database. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `20260908165640_add_category_fields` thêm `updated_at NOT NULL` không default (còn nguyên cảnh báo của Prisma); 13/16 migration có timestamp tròn (đặt tên tay); CI không kiểm drift.
  - **Hướng xử lý**: thêm `prisma migrate diff --exit-code` vào CI.
- **DB-07** · `[NGUYÊN TẮC]` · Low · Database. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `MagicLinkToken`/`PasswordResetToken` có `userId` nhưng không có relation (`schema.prisma:131-152`). Xoá mềm chỉ áp cho User/File/Product/Blog; Category/Coupon xoá cứng; wishlist/review vẫn trỏ tới sản phẩm đã xoá mềm.
  - **Hướng xử lý**: thêm FK; ghi chính sách xoá vào docs/05.
- **VAL-02** · `[NGUYÊN TẮC]` · Low · Validation. **Độ chắc chắn**: Đã xác nhận (code).
  - **Bằng chứng**: `specialDates.validation.ts:6, 10` và `orders.validation.ts:19` chỉ kiểm bằng regex, nên `2026-13-01` → Invalid Date → 500, còn `2026-02-31` trôi sang tháng 3; `page` không có `.max()` ở 13 schema; id của roles/permissions là `z.coerce.number().int()` không giới hạn.
  - **Hướng xử lý**: kiểm ngày hợp lệ theo lịch; giới hạn `page`.
- **ERR-06** · `[NGUYÊN TẮC]` · Low · Validation & lỗi. **Độ chắc chắn**: Rủi ro tiềm ẩn.
  - **Bằng chứng**: kiểm "hôm nay" theo giờ local (`orders.validation.ts:33-35`) và sinh mã đơn theo giờ local (`orders.service.ts:69-70`), nhưng gom doanh thu theo UTC (`dashboard.service.ts:102, 113`); container không đặt `TZ`.
  - **Hướng xử lý**: chốt `Asia/Ho_Chi_Minh` làm múi giờ nghiệp vụ.
- **ERR-07** · `[NGUYÊN TẮC]` · Low · Validation & lỗi. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `useConfirmStore.ts:26-35` ghi đè `resolve` nên promise trước treo; các vòng upload `mutateAsync` không có `catch` (`products/page.tsx:382-389`, `blog:91`, `categories:125`); `useCartStore.ts:79-82` persist không có `version`/`migrate` dù đã đổi tên field (`:14-15`), nên giỏ cũ có thể tính ra `NaN`.
  - **Hướng xử lý**: settle promise cũ; thêm `catch`; `version` + `migrate`.
- **FE-07** · `[CHUẨN]` · Low · Frontend. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: 61 literal `queryKey` trong 25 file; namespace lẫn lộn (`superadmin` ở `auditLog.hooks.ts:8` nhưng `admin` ở `adminUsers.hooks.ts:15`; `files`/`folders`/`reviews` không có namespace); `view` (UI-only) nằm trong key của files.
  - **Hướng xử lý**: key factory theo từng feature.
- **FE-10** · `[CHUẨN]` · Low · Frontend. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `#ec4899` (pink-500, lệch màu brand) ở `(storefront)/layout.tsx:28`, `global-error.tsx:49`; `CATEGORY_COLORS` lặp 3 lần (`(storefront)/page.tsx:11`, `ProductCard.tsx:20`, `BlogPostCard.tsx:6`); 48 class màu mặc định Tailwind (`text-red-600` ×28...) do thiếu token danger/warning/success.
  - **Hướng xử lý**: bổ sung các token này vào `globals.css`.
- **FE-11** · `[NGUYÊN TẮC]` · Low · Frontend. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**:
    - `HeroPetals.tsx:4` import tĩnh `three` vào trang chủ.
    - Ô search ở `superadmin/users/page.tsx:26, 46` gọi API mỗi phím, không debounce.
    - `limit: 100` cứng, không phân trang: products `:345`, blog `:57`, coupons `:64`, newsletter.
    - Một `isPending` dùng chung cho mọi hàng: `orders/page.tsx:243, 259`.
    - `(storefront)/loading.tsx` có hình dạng trang chủ nhưng dùng cho mọi segment.
  - **Hướng xử lý**: `next/dynamic`, debounce, phân trang, loading state theo từng hàng.
- **CODE-04** · `[CHUẨN]` · Low · Clean code. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: comment rất dài, kiểu nhật ký ("Bug thật đã xảy ra...", mã docs/12) ở `proxy.ts:30-36`, `login/page.tsx:33-38`, `axios.ts:37-40`. Một số comment khẳng định đã sửa lỗi trong khi lỗi vẫn còn (xem FE-02). Lưu ý: CLAUDE.md của dự án chủ trương ghi lại bug trong comment, nên đây là điểm lệch giữa quy ước dự án và chuẩn khoá học.
  - **Hướng xử lý**: giữ phần "vì sao" ngắn gọn; lịch sử bug đưa vào docs/12 và commit message.
- **CODE-05** · `[CHUẨN]` · Low · Clean code. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `backend/.prettierrc.json` dùng `singleQuote: false`, `frontend/.prettierrc.json` dùng `true`; `format:check` của frontend không quét `e2e/` (có file dùng `"`, có file dùng `'`); ESLint không có `no-console`, `jsx-a11y/recommended`, `@tanstack/eslint-plugin-query`; zod v3 ở backend, v4 ở frontend.
  - **Hướng xử lý**: Prettier chung ở gốc; bổ sung rule ESLint.
- **CODE-06** · `[NGUYÊN TẮC]` · Low · Clean code. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**:
    - `IconDevices` không được dùng (`icons.tsx:225`); nhánh `soon` chết (`DashboardShell.tsx:16, 65-78`).
    - SVG boilerplate trong `frontend/public/`.
    - `vitest.config.ts:33` loại trừ `src/config/r2.ts`, file này không tồn tại.
    - `domain/README.md:3` nhắc module `cart/` không có.
    - `.design/.../flower-storefront-directions.html` (2,5 MB) được track dù `.gitignore` loại trừ.
    - TODO không có mã theo dõi (`ve-chung-toi/page.tsx:12`, `Footer.tsx:146`), trái CLAUDE.md §3.
  - **Hướng xử lý**: dọn các mục trên; gắn mã CHECKLIST cho TODO.
- **TEST-03** · `[NGUYÊN TẮC]` · Low · Kiểm thử. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `frontend/e2e/` chỉ có auth/account/categories/superadmin; không có E2E giỏ hàng → checkout → trang đơn, là luồng doanh thu chính. Không có test cho các trang admin CRUD.
  - **Hướng xử lý**: một E2E cho luồng mua hàng.
- **DOC-03** · `[CHUẨN]` · Low · Tài liệu. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: `docs/gitbook/` dành cho khách hàng/bên liên quan (tiến độ, ước lượng, rủi ro); chưa có hướng dẫn sử dụng theo vai trò (admin, florist, khách).
  - **Hướng xử lý**: `docs/user-guide.md`.
- **OPS-02** · `[CHUẨN]` · Low · Vận hành. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**: không có `package.json` ở gốc (workspaces, `concurrently`), `.editorconfig`, husky/lint-staged. Phải mở 2 terminal để chạy dev.
  - **Hướng xử lý**: npm workspaces + lint-staged.
- **OPS-03** · `[NGUYÊN TẮC]` · Low · Vận hành. **Độ chắc chắn**: Đã xác nhận.
  - **Bằng chứng**:
    - `/health` trả tĩnh (`app.ts:28`) nhưng lại là target HEALTHCHECK (`backend/Dockerfile:35-36`).
    - `frontend/Dockerfile:29-32` copy toàn bộ `node_modules` (không dùng `output: standalone`), `npm start` là PID 1, không có healthcheck.
    - `docker-compose.yml:60` dùng `service_started` nên worker không thực sự chờ migrate.
    - Backup đọc cả dump vào RAM (`backupDatabase.job.ts:50-53`).
  - **Hướng xử lý**: health kiểm `SELECT 1`; image standalone; `condition: service_healthy`.

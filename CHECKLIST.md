# ✅ CHECKLIST — Theo dõi tiến độ dự án FLOWER

> **Cập nhật lần cuối: 18/09/2026**
> Cập nhật file này **mỗi lần merge PR**. Tiến độ dạng khách hàng đọc được: [docs/gitbook/03-tien-do.md](docs/gitbook/03-tien-do.md).
> 🧭 **Review 24/09/2026** (`review-fullstack-js`, mốc `bdf8d99`): 7,25/10 — 61 vấn đề, xem phần
> ["Lộ trình cải thiện theo review-source"](#-lộ-trình-cải-thiện-theo-review-source-review-24092026) ở cuối file.

| Ký hiệu | Nghĩa                                                |
| :-----: | ---------------------------------------------------- |
|   ✅    | Xong — đã code, **đã có test**, đã cập nhật tài liệu |
|   🟡    | Đang làm dở                                          |
|   ⬜    | Chưa bắt đầu                                         |

> ⚠️ Chỉ tick ✅ khi đủ **Definition of Done** ở [docs/11 §3](docs/11-quy-trinh-phat-trien.md#3-definition-of-done--điều-kiện-coi-là-xong).
> "Code xong nhưng chưa test / chưa có tài liệu" là 🟡.

---

## 📊 Tổng quan

| Phase | Nội dung                                                     | Trạng thái | Tiến độ         |
| :---: | ------------------------------------------------------------ | :--------: | --------------- |
|   1   | Foundation — TS strict, error/response chuẩn, API versioning |     ✅     | ██████████ 100% |
|   2   | Authentication — 3 phương thức, session, rotation            |     ✅     | ██████████ 100% |
|   3   | RBAC — users, roles, permissions, audit log                  |     ✅     | ██████████ 100% |
|   4   | Infrastructure — Cloudinary, email, jobs, settings           |     ✅     | ██████████ 100% |
|   5   | Domain — nghiệp vụ shop hoa                                  |     🟡     | ██████████ 96%  |
|   6   | Quality — testing, OpenAPI, logging                          |     ✅     | ██████████ 100% |
|   7   | Production — Docker, CI/CD, monitoring                       |     🟡     | ██████░░░░ 69%  |

**Tổng thể: ~52%** · Số test đang chạy: **1076** (BE 929 · FE 147) + 32 kịch bản E2E + 5 test DB thật

---

## Phase 1 — Foundation ✅

- [x] TypeScript strict + `noUncheckedIndexedAccess` (BE + FE)
- [x] Cấu trúc modular + MVC + Service Layer
- [x] Tách ranh giới `shared/` (hạ tầng) vs `modules/core/` vs `modules/domain/`
- [x] `AppError` + `ValidationError` + `errorHandler` tập trung
- [x] `ApiResponse` — `ok()` / `created()` / `paginated()`
- [x] `asyncHandler` bọc 100% controller
- [x] `validate()` bằng zod cho body/query/params
- [x] API versioning `/api/v1` + `GET /health` ngoài versioning
- [x] `requestId` middleware + header `X-Request-Id`
- [x] Graceful shutdown (SIGTERM/SIGINT + force exit 10s)
- [x] `config/env.ts` fail-fast khi thiếu biến bắt buộc
- [x] Tách `app.ts` / `server.ts` để test được
- [x] Prisma singleton chống rò connection pool
- [x] ESLint flat config + `typescript-eslint`
- [x] **Prettier** — `BE-08` 🟡 _(mỗi package 1 `.prettierrc.json` khớp quy ước đa số sẵn có, xem docs/12)_

## Phase 2 — Authentication ✅

- [x] Đăng ký + đăng nhập email/mật khẩu (bcrypt cost 12)
- [x] Magic link — token hash sha256, dùng 1 lần, TTL 15 phút
- [x] Google OAuth — verify ID token (không dùng luồng redirect)
- [x] Quên mật khẩu / đặt lại mật khẩu
- [x] Access token JWT 5 phút — **payload chỉ chứa `sub`**
- [x] Refresh token rotation, lưu sha256 trong DB
- [x] Cookie `httpOnly` + `secure` theo env + `sameSite=lax`
- [x] Cookie `refresh_token` path `/api/v1` (đủ rộng cho `/account/sessions`)
- [x] Quản lý thiết bị + đăng xuất từ xa (giữ phiên hiện tại)
- [x] Rate limit auth (20/15p) + magic link (5/15p)
- [x] **Chống dò tài khoản** — 3 nhánh trả response giống hệt nhau
- [x] Bật/tắt từng phương thức đăng nhập
- [x] Axios interceptor tự refresh + xếp hàng khi nhiều 401 đồng thời

## Phase 3 — RBAC ✅

- [x] Permission-based (`authorize('code')`), **không** hard-code role
- [x] Tra role/permission từ DB **mỗi request** — đổi quyền có hiệu lực ngay
- [x] 3 System Role `super_admin` / `admin` / `member` (không xoá được)
- [x] CRUD Custom Role + gán permission
- [x] CRUD Permission (`is_system` khoá đổi code/xoá)
- [x] **Lọc bỏ permission `is_restricted`** ở cả create lẫn update role
- [x] Chặn tự block / tự xoá / tự đổi role chính mình
- [x] Chặn gán `super_admin` qua API
- [x] Xoá mềm user — giải phóng email + thu hồi toàn bộ session
- [x] Reset password: gửi email **trước** rồi mới ghi DB
- [x] Audit log cho mọi thao tác nhạy cảm (best-effort, không rollback)
- [x] API lọc/tìm/phân trang danh sách user
- [x] UI `/superadmin/users` · `/roles` · `/permissions` · `/login-methods`
- [x] `AdminShell` refetch `/account/me` mỗi lần đổi route
- [x] Trang `/403` riêng cho "đã đăng nhập nhưng thiếu quyền"
- [x] **Màn hình tra cứu Audit Log** _(11/09/2026 — `/superadmin/audit-logs`, lọc theo loại đối tượng/khoảng ngày, chi tiết before/after dạng JSON, xác nhận thật với 130 bản ghi audit log trên DB dev)_
- [x] **Row-level check** cho module domain _(11/09/2026 — `GET /api/v1/account/orders`, lọc `userId = req.user.id` ngay trong query, xác nhận thật với 2 tài khoản trên DB dev; hàng đợi giao hàng `shipper` còn lại, cần bảng `order_deliveries` trước — xem docs/12 §5.1)_

## Phase 4 — Infrastructure ✅

- [x] Upload ký chữ ký (HMAC) lên Cloudinary trực tiếp từ trình duyệt (mime/format whitelist qua `allowed_formats`, publicId UUID, kích thước kiểm chứng lại qua Admin API sau upload — xem `BE-10` ở [`docs/12`](docs/12-danh-gia-va-de-xuat.md))
- [x] `file_usages` — đánh dấu tái sử dụng ảnh
- [x] Xoá mềm file
- [x] Cron dọn file mồ côi (10 ngày/lần, ngưỡng an toàn 24h)
- [x] Cron backup DB → Cloudinary (`resource_type: raw`, 2 ngày/lần) + tự xoá bản > 30 ngày
- [x] Email abstraction Resend / Nodemailer-SMTP (đổi qua env)
- [x] Ghi `email_logs` cho mọi lần gửi (`sent` / `failed` + `error`)
- [x] `login_method_settings` + chốt chặn ≥ 1 phương thức bật
- [x] Form Liên hệ công khai (`/api/v1/contact`, rate limit 5/15p theo IP) + admin xem/đánh dấu xử lý (`contact.manage`) — xem [docs/modules/core-contact.md](docs/modules/core-contact.md)
- [x] CRUD `folders` _(`BE-19`)_
- [x] **Màn hình quản lý tài nguyên** (cây thư mục lazy-load, xem file dạng lưới/danh sách) _(11/09/2026 — `/admin/resources`, xem [docs/modules/core-files.md §8](docs/modules/core-files.md))_
- [x] **Mở rộng `system_settings` key-value tổng quát** _(11/09/2026 — `site_name`/`site_logo`/`timezone`/`registration_enabled`, UI `/superadmin/settings`; `registration_enabled` có enforcement thật ở `auth.service.ts`; phát hiện VÀ xử lý luôn `BE-20` khi làm (nối lại đăng ký qua magic link) — xem [docs/12](docs/12-danh-gia-va-de-xuat.md); CHƯA làm `maintenance_mode` — cần middleware riêng, xem [docs/modules/core-settings.md §4](docs/modules/core-settings.md))_
- [x] Nén + mã hoá backup _(`OPS-02` — `pg_dump --compress=9` + RSA/AES-256-GCM khi có `BACKUP_ENCRYPTION_PUBLIC_KEY`; còn thiếu tách bucket/tài khoản Cloudinary riêng — việc vận hành, xem docs/12)_

## Phase 5 — Domain 🟡

- [x] **Categories** — CRUD cây, slug tự sinh bỏ dấu, chống vòng lặp cha-con
- [x] API công khai `/categories` (không lộ trường nội bộ)
- [x] UI `/admin/categories`
- [x] **Products** — CRUD, giá, thư viện nhiều ảnh, mô tả rich text (TipTap, sanitize XSS ở backend), soft delete _(không có tồn kho — hoa tươi làm theo đơn)_
- [x] **`product_variants` (size/giá riêng)** _(11/09/2026 — bảng quan hệ riêng, KHÔNG có tồn kho (cùng triết lý `basePrice`); đồng bộ theo kiểu thay thế toàn bộ danh sách nhưng GIỮ NGUYÊN `id` của biến thể đang sửa (tránh vỡ `order_items.variant_id` của đơn cũ); `orders.service.ts` chống IDOR — kiểm tra `variantId` thật sự thuộc `productId` gửi lên; giỏ hàng/checkout gộp dòng theo `(productId, variantId)`; UI chọn size ở trang chi tiết sản phẩm + quản lý biến thể ở `/admin/products` — xem [docs/modules/domain-products.md §8](docs/modules/domain-products.md))_
- [x] API công khai `/products` (phân trang, không lộ trường nội bộ)
- [x] UI `/admin/products`
- [x] Trang chủ storefront (`/`) đọc danh mục/sản phẩm thật qua API công khai (Server Component, `fetch` + `revalidate: 60s`) — thay hẳn mảng dữ liệu giả cứng trong code trước đó
- [x] Dữ liệu mẫu: 4 danh mục + 8 sản phẩm qua `domain.seed.ts` (chưa có ảnh — seed script không tự upload Cloudinary được, hiện icon hoa thay thế)
- [x] Trang danh mục (`/danh-muc/[slug]`) + trang chi tiết sản phẩm (`/san-pham/[slug]`) — API công khai `GET /products/:slug`, gallery đổi ảnh, sản phẩm liên quan cùng danh mục, CTA gọi/Zalo
- [x] **Occasions (dịp lễ)** _(12/09/2026 — tag phẳng (không cây), n-n với sản phẩm qua `product_occasions`; dùng LẠI permission `categories.manage` (không tách permission riêng); xoá occasion KHÔNG chặn dù còn sản phẩm gắn tag (`onDelete: Cascade` chỉ gỡ tag, khác categories chặn xoá khi còn con); UI `/admin/occasions` + chọn nhiều dịp lễ (pill) ở form sản phẩm + trang storefront `/dip-le/[slug]` + chip dịp lễ ở trang chi tiết sản phẩm — xem [docs/modules/domain-occasions.md](docs/modules/domain-occasions.md))_
- [x] **Cart (guest cart)** — lưu phía client (Zustand + localStorage), KHÔNG có bảng `carts` ở backend _(quyết định kiến trúc — xem [docs/modules/domain-orders.md §1](docs/modules/domain-orders.md))_
- [x] **Orders + chọn ngày giờ giao** — giai đoạn cơ bản: guest checkout, COD, cửa hàng xác nhận qua điện thoại _(chưa thanh toán online — xem [docs/modules/domain-orders.md §8](docs/modules/domain-orders.md))_
- [x] Trang giỏ hàng (`/gio-hang`) + checkout (`/thanh-toan`) + xác nhận đơn công khai (`/don-hang/[id]`, `id` UUID làm token tra cứu)
- [x] UI `/admin/orders` — lọc theo trạng thái, mở rộng xem chi tiết, đổi trạng thái (quyền theo giá trị `status`, đúng ma trận docs/05 §2.4)
- [x] **Sổ địa chỉ người nhận** _(12/09/2026 — thuần dữ liệu cá nhân, KHÔNG permission riêng (chỉ cần đăng nhập, giống `/account/profile`); địa chỉ đầu tiên tự động mặc định; mọi thao tác theo `id` chống IDOR (`where: {id, userId}`); tích hợp autofill ở trang thanh toán qua dropdown "Chọn từ sổ địa chỉ" — xem [docs/modules/domain-addresses.md](docs/modules/domain-addresses.md))_
- [x] **Dashboard tổng quan admin lấy dữ liệu thật** _(18/09/2026 — thay hẳn placeholder tĩnh (3 ô `'—'` + dòng chữ nói về kiến trúc `features/domain` lộ ra UI); tái dùng permission `reports.view` đã seed sẵn nhưng chưa module nào dùng tới (phát hiện thiếu trong `SUPER_ADMIN_PERMISSIONS` ở test helper, đã bổ sung); 2 endpoint mới `GET /admin/dashboard/{overview,revenue-chart}`; `orders.byStatus` CỐ Ý không lọc theo `period` (ảnh chụp hàng đợi vận hành hiện tại, khác số liệu xu hướng còn lại) — xem [docs/modules/domain-dashboard.md §2](docs/modules/domain-dashboard.md); không có widget "sắp hết hàng" (hệ thống không có tồn kho theo thiết kế); biểu đồ doanh thu dùng Recharts (thêm mới); đối chiếu số liệu hiển thị với truy vấn Prisma trực tiếp trên DB dev — khớp chính xác từng con số; kiểm tra thật qua Playwright, không có lỗi console/network)_
- [ ] Payments online (VNPay/Momo) ⬜ _(7 ngày — hiện chỉ COD)_
- [x] **Lịch giao hoa theo ngày (dashboard riêng cho florist)** _(12/09/2026 — permission RIÊNG `orders.view_delivery_queue` (florist có, KHÔNG có `orders.view_all`); trang `/admin/orders/delivery-queue`, sidebar rút gọn còn đúng 1 link khi user chỉ có role florist (không kiêm admin); không có nút "Huỷ đơn" (florist không có `orders.cancel`) — xem [docs/modules/domain-orders.md §4b](docs/modules/domain-orders.md))_
- [x] **Reviews + wishlist** _(12/09/2026 — reviews cần duyệt (`isApproved` mặc định false, permission `reviews.moderate` riêng), mỗi user 1 đánh giá/sản phẩm; wishlist là bảng nối n-n thuần, idempotent thêm/xoá; phát hiện và sửa 1 bug hydration mismatch thật khi build (`ProductReviews.tsx` — xem [docs/modules/domain-reviews.md §4](docs/modules/domain-reviews.md)) — xem thêm [docs/modules/domain-wishlist.md](docs/modules/domain-wishlist.md))_
- [x] **Promotions / coupons** _(12/09/2026 — 1 đơn tối đa 1 mã (`CouponUsage.orderId` unique); `usedCount` đếm sẵn (denormalized), tăng ATOMIC bằng `updateMany` có điều kiện NGAY TRONG transaction tạo đơn để chống race condition hết lượt dùng; `Order.couponCode`/`discountAmount` là snapshot (không phải FK sống), cùng triết lý `OrderItem.productName`; permission `promotions.manage` dùng LẠI (đã seed sẵn từ đầu dự án); xoá mã chặn khi `usedCount > 0` (409 `COUPON_IN_USE`, cùng mẫu `CATEGORY_HAS_CHILDREN`); UI `/admin/coupons` + tích hợp ô nhập mã ở `/thanh-toan` — xem [docs/modules/domain-coupons.md](docs/modules/domain-coupons.md))_
- [x] **Blog + newsletter** _(12/09/2026 — Blog: `publishedAt` nullable DateTime thay cho cờ `isPublished` (null = draft, có giá trị = đã/sẽ xuất bản, cho phép LÊN LỊCH xuất bản tương lai miễn phí); tái sử dụng nguyên bản `RichTextEditor`/`useUploadFile`/`sanitizeDescriptionHtml` đã có cho Products; xoá = soft delete giống Product. Newsletter: form đăng ký ở footer, chỉ giai đoạn THU THẬP email (chưa gửi campaign hàng loạt); `unsubscribe` luôn trả thành công (không xác nhận/phủ nhận email tồn tại). Cả 2 dùng LẠI permission `blog.manage` có sẵn từ đầu dự án — xem [docs/modules/domain-blog.md](docs/modules/domain-blog.md))_
- [x] **Nhắc lịch sinh nhật/kỷ niệm** _(12/09/2026 — bảng `special_dates` (label/date/remindDaysBefore), permission như `addresses`/`wishlist` (chỉ cần đăng nhập); `date` chỉ THÁNG-NGÀY có ý nghĩa (lặp lại hằng năm), năm nhập không quan trọng; job nền hằng ngày (`sendSpecialDateReminders.job.ts`) tính "ngày dịp lễ sắp tới" (năm nay/năm sau) rồi so với `remindDaysBefore`, gửi email best-effort; `lastRemindedYear` chống gửi trùng khi job chạy bù trong ngày; sửa ngày/số-ngày-nhắc tự reset `lastRemindedYear`; tab "Ngày đặc biệt" mới ở `/account` — xem [docs/modules/domain-special-dates.md](docs/modules/domain-special-dates.md))_
- [x] **Realtime trạng thái đơn (Socket.io)** _(12/09/2026 — hạ tầng tách CORE (`modules/core/realtime/realtime.service.ts` — `initSocket()`/`getIO()`, không biết gì về đơn hàng) khỏi DOMAIN (`orders.realtime.ts` — room/event/kiểm tra quyền cụ thể); 2 loại room: `order:<id>` join KHÔNG cần đăng nhập (id đóng vai trò token, cùng mô hình bảo mật của `GET /orders/:id`) và `admin:orders` PHẢI xác thực cookie + đủ `orders.view_all`/`orders.view_delivery_queue` (Socket.io không đi qua Express middleware, tự đọc thẳng header Cookie lúc handshake); `orders.service.ts` phát `order:created`/`order:status_changed` NGAY SAU khi ghi DB (không gói trong transaction); trang xác nhận đơn công khai + `/admin/orders` + `/admin/orders/delivery-queue` tự cập nhật KHÔNG cần F5 — xem [docs/modules/domain-orders.md §10](docs/modules/domain-orders.md))_
- [x] **Site Content — admin tự sửa banner Hero/hotline/Zalo/địa chỉ/giờ mở cửa** _(13/09/2026 — dùng chung bảng `system_settings` với core-settings (khác namespace key, không migration riêng); permission RIÊNG `site_content.manage` (khác `settings.manage` 🔒 chỉ super_admin) gán cho CẢ `admin` lẫn `super_admin`; route public `GET /site-content` dùng chung cho cả storefront lẫn trang quản trị đọc (không có `GET /admin/site-content` riêng); `hero_banner` theo đúng pattern `site_logo` (lưu fileId, đánh dấu `file_usages`, fallback ảnh tĩnh khi null); storefront đọc qua `getStorefrontSiteContent()` (Server Component, `revalidate: 60s`) truyền prop xuống — KHÔNG dùng React Context; UI `/admin/site-content` — xem [docs/modules/domain-site-content.md](docs/modules/domain-site-content.md))_

## Phase 6 — Quality 🟡

- [x] **Backend: 900 test** (unit + integration) — chạy **không cần database**
- [x] **Frontend: 147 test** (unit + component + hook)
- [x] **E2E Playwright: 32 kịch bản** (auth · superadmin · account · categories)
- [x] Hạ tầng test: Prisma mock tự sinh, `loginAs()` helper
- [x] `npm run typecheck` phủ cả `src/` lẫn `tests/`
- [x] Tài liệu kỹ thuật đầy đủ — 14 doc chính + 17 module doc, 54 sơ đồ Mermaid
- [x] Script kiểm tra cú pháp Mermaid (`scripts/check-mermaid.mjs`)
- [x] Tài liệu khách hàng (GitBook) — 7 trang + cấu hình sync
- [x] **CI/CD GitHub Actions** _(14/09/2026 — `.github/workflows/ci.yml` thật, 4 job: `backend`/`frontend`/`docs` chạy mỗi PR + push `main`, `e2e` (Postgres thật + Playwright) chỉ chạy khi vào `main`. Xác nhận CHẠY XANH THẬT trên GitHub Actions (không phải suy đoán) sau khi sửa 6 bug thật do chính CI phát hiện: (1) 4 file backend chưa format Prettier; (2) `next typegen` phải chạy trước `tsc --noEmit` (kiểu `LayoutProps` Next.js tự sinh, máy dev có sẵn từ trước nên không lộ); (3) selector E2E `/đăng nhập/i` khớp nhầm nút magic-link; (4) `authLimiter` (20 req/15p/IP) làm cả suite fail dây chuyền — thêm cờ `DISABLE_RATE_LIMIT` chỉ bật ở CI (`BE-21`); (5) 2 bug UI thật: trang Hồ sơ gửi `phone: ''` thay vì `null` khiến lưu luôn lỗi 422 với user chưa có SĐT, và toàn bộ trang quản lý Danh mục thiếu `htmlFor`/`id` nên label không gắn được với input (ảnh hưởng cả screen reader thật); (6) form Đăng ký thiếu `noValidate` nên validate nguyên sinh của trình duyệt chặn mất thông báo lỗi zod. Branch protection CHƯA bật — cần tự bật thủ công trên GitHub nếu muốn chặn merge khi CI đỏ)_
- [x] **OpenAPI/Swagger sinh từ zod schema** _(`BE-12`, 11/09/2026 — `GET /docs` (Swagger UI) + `GET /openapi.json`, request sinh trực tiếp từ `*.validation.ts` (không thể lệch), 61/61 endpoint)_
- [x] Test cho `jobs/` _(cleanupOrphanFiles, cleanupExpiredTokens, backupDatabase/cleanupOldBackups, backupEncryption)_
- [x] **Integration test với PostgreSQL thật (Testcontainers)** _(14/09/2026 — `backend/tests/db/` (5 test), config riêng `vitest.config.db.ts` không alias Prisma sang mock, `globalSetup.ts` tự dựng Postgres qua `@testcontainers/postgresql` + chạy thật `prisma migrate deploy`. Bắt lỗi migration sạch, unique constraint thật (`P2002`), `onDelete: Cascade` thật, composite unique thật, và seed script (`seed:core`/`seed:domain`) chạy sạch trên schema hiện tại. Script riêng `npm run test:db` — KHÔNG nằm trong `npm test` mặc định (cần Docker). CI: step mới trong job `backend`, chỉ chạy khi vào `main` (giống `e2e`). Xác nhận CHẠY XANH THẬT trên GitHub Actions sau khi sửa 2 bug thật do chính CI phát hiện (máy dev không có Docker nên không tự chạy được cục bộ trước khi push): (1) `vitest.config.ts` gốc dùng `include: ["tests/**/*.test.ts"]` — glob rộng tự nhặt nhầm cả `tests/db/` vào chạy chung với mock, phải thêm `exclude` tường minh; (2) `vitest.config.db.ts` quên hẳn alias `@/` → `src/` (chỉ copy phần loại trừ Prisma), khiến mọi import `@/config/prisma` lỗi resolve ngay từ đầu. Xem docs/08-kiem-thu.md §3.4)_
- [x] Logger `pino` (JSON có cấu trúc) _(`BE-18`)_
- [x] **Rà soát bảo mật độc lập** _(14/09/2026 — đối chiếu ĐỘC LẬP từng khẳng định ✅ trong `docs/07-bao-mat.md` với code thật (không chỉ tin tài liệu): xác nhận đúng self-protection admin (`assertNotSelf`), chặn shadow super_admin qua Custom Role, cờ `DISABLE_RATE_LIMIT` không rò rỉ production, 2 tính năng mới (order call verification, site content) đều chặn đúng ở backend. Tìm + sửa: 2 lỗ hổng `npm audit` moderate ở dependency production (`qs`/`express`, đã fix + 900 test backend vẫn pass), tài liệu `docs/07` §1 ghi sai cookie dùng `SameSite=Strict` trong khi code thật là `Lax`. Tìm nhưng CHƯA sửa (để việc riêng, cần nâng major breaking): `uuid`/`gaxios` đòi nâng `google-auth-library` 9→11, `@vitest/mocker` đòi nâng `vitest` 3→5 (dev-only, không vào production). Không thay thế penetration test bên thứ 3 thật sự — xem docs/12 BE-22, docs/07 §0/§9)_

## Phase 7 — Production 🟡

- [x] **`Dockerfile` backend** (multi-stage, non-root, có `pg_dump`) _(14/09/2026 — `backend/Dockerfile`, xem docs/10 §5.1 — ĐÃ build/chạy thật, xem mục "Triển khai VPS lần đầu" bên dưới)_
- [x] **`Dockerfile` frontend** (truyền `NEXT_PUBLIC_*` lúc build) _(14/09/2026 — `frontend/Dockerfile`, xem docs/10 §5.2)_
- [x] **`docker-compose.yml` + reverse proxy Caddy + TLS** _(14/09/2026 — gốc repo, Caddy tự xin TLS Let's Encrypt, tự proxy WebSocket cho Socket.io — xem docs/10 §5.3-§5.4)_
- [x] **Container `worker` cho cron** _(`OPS-01`, 14/09/2026 — cùng image `backend`, `RUN_JOBS=true`, 1 replica cố định trong `docker-compose.yml`)_
- [x] **Secret riêng cho production** (JWT, cookie, DB) _(14/09/2026 — sinh thật bằng `openssl rand`, khác hoàn toàn giá trị mẫu; Cloudinary/SMTP dùng lại tài khoản đã có sẵn từ trước)_
- [x] **HTTPS + HSTS + redirect HTTP→HTTPS** _(14/09/2026 — Caddy tự xin chứng chỉ Let's Encrypt cho `thuymaiflower.click`/`api.thuymaiflower.click`, xác nhận thật qua trình duyệt)_
- [x] **Triển khai VPS lần đầu — `thuymaiflower.click`** _(14/09/2026 — Ubuntu 22.04, xem docs/10 §5.6. Phát hiện + sửa 4 bug thật chỉ lộ ra lúc chạy thật (không phát hiện được lúc chỉ đọc/viết code): (1) quên seed dữ liệu ban đầu; (2) `prisma`/`tsx` nằm nhầm `devDependencies` khiến lệnh `migrate deploy`/seed lỗi "command not found" trong image production (`npm ci --omit=dev`); (3) Alpine thiếu gói `openssl` khiến Prisma nhận diện sai libssl, cố tải lại engine lúc container chạy bằng user non-root → crash-loop; (4) cookie đăng nhập thiếu `COOKIE_DOMAIN` nên Next.js middleware (chạy ở subdomain frontend) không đọc được cookie do backend set ở subdomain khác, đăng nhập xong vẫn bị đá về `/login`; (5) Dockerfile frontend quên copy `next.config.ts` vào giai đoạn chạy, khiến `/_next/image` chặn hết ảnh Cloudinary. Xem chi tiết từng bug ở docs/10 §5.5-§5.6)_
- [x] **Resend verify DKIM/SPF/DMARC** _(14/09/2026 — domain `thuymaiflower.click` verify xong trên Resend (DKIM TXT + 2 CNAME SPF + DMARC TXT, lan truyền DNS ~7 phút); `backend/.env` đổi `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM="Hoa Xinh <no-reply@thuymaiflower.click>"`, `docker compose up -d` áp dụng không cần build lại. Xác nhận THẬT: gửi thử "Quên mật khẩu" từ trang production, email đến đúng **Hộp thư đến** (không vào Spam) với đúng người gửi/domain đã verify. Thay hẳn Gmail SMTP cá nhân (giới hạn ~500 email/ngày, dễ vào spam))_
- [x] **Uptime monitor trỏ vào `/health`** _(14/09/2026 — UptimeRobot free (50 monitor, check mỗi 5 phút), cảnh báo qua email. 2 monitor `HTTP(s)`: `https://api.thuymaiflower.click/health` và `https://thuymaiflower.click`. Xác nhận THẬT: cả 2 đều "Up", uptime 100%)_
- [ ] Log tập trung + cảnh báo bất thường
- [ ] Sentry (FE + BE)
- [ ] **Diễn tập khôi phục backup** _(bắt buộc trước khi mở cho người dùng thật)_
- [ ] Chạy thử tải mô phỏng cao điểm dịp lễ

---

## 🔧 Nợ kỹ thuật

Chi tiết đầy đủ: [docs/12 · Đánh giá & đề xuất](docs/12-danh-gia-va-de-xuat.md).

### 🔴 Bắt buộc trước production — ~11 giờ

| Mã      | Vấn đề                                                              | Ước lượng | Trạng thái |
| ------- | ------------------------------------------------------------------- | --------- | :--------: |
| `BE-01` | Đổi mật khẩu **không thu hồi phiên cũ** (cả 3 luồng)                | 2h        |     ✅     |
| `BE-02` | Thiếu `trust proxy` → rate limit + audit IP sai sau reverse proxy   | 1h        |     ✅     |
| `BE-03` | Không phát hiện dùng lại refresh token đã thu hồi                   | 4h        |     ✅     |
| `BE-04` | Google login không kiểm tra `email_verified`                        | 1h        |     ✅     |
| `BE-05` | Token dùng-một-lần chưa nguyên tử (race condition)                  | 2h        |     ✅     |
| `BE-06` | `roles.update` không dùng transaction → mất sạch permission nếu lỗi | 1h        |     ✅     |

### 🟡 Chất lượng & vận hành — ~38 giờ

| Mã       | Vấn đề                                                         | Ước lượng | Trạng thái |
| -------- | -------------------------------------------------------------- | --------- | :--------: |
| `BE-07`  | Lỗi Prisma (P2002/P2025/P2003) → 500 thay vì 409/404           | 2h        |     ✅     |
| `BE-08`  | Chưa có Prettier — style không thống nhất                      | 2h        |     ✅     |
| `BE-09`  | `cleanupOrphanFiles` xoá file vừa xoá mềm, không có cửa sổ 24h | 0.5h      |     ✅     |
| `BE-10`  | `createFileRecord` không kiểm chứng `publicId`                 | 3h        |     ✅     |
| `BE-11`  | `env.ts` chỉ kiểm tra tồn tại, không kiểm tra giá trị          | 3h        |     ✅     |
| `BE-12`  | Chưa có OpenAPI/Swagger                                        | 8h        |     ✅     |
| `BE-13`  | Token/session hết hạn tích tụ vô hạn                           | 3h        |     ✅     |
| `FE-01`  | Chưa có Error Boundary → lỗi render = trang trắng              | 2h        |     ✅     |
| `FE-02`  | Hai nguồn sự thật cho user (`useAuthStore` + `useMe`)          | 3h        |     ✅     |
| `FE-03`  | ~~Comment `axios.ts` ghi "15 phút", thực tế 5 phút~~           | 5m        |     ✅     |
| `OPS-01` | Cron chạy trong tiến trình API → chặn scale ngang              | 3h        |     ✅     |
| `OPS-02` | Backup chưa nén, chưa mã hoá                                   | 4h        |     ✅     |
| `OPS-03` | `cleanupOldBackups` chỉ xử lý 1000 object đầu                  | 1h        |     ✅     |

### 🟢 Cải thiện — ~24 giờ

| Mã       | Vấn đề                                                             | Ước lượng | Trạng thái |
| -------- | ------------------------------------------------------------------ | --------- | :--------: |
| `BE-14`  | `tsconfig` khai báo `paths` không dùng, runtime không resolve      | 0.5h      |     ✅     |
| `BE-15`  | `JWT_REFRESH_EXPIRES_IN` trong `.env` nhưng code hard-code 30 ngày | 0.5h      |     ✅     |
| `BE-16`  | Rate limit chỉ theo IP, chưa theo email                            | 2h        |     ✅     |
| `BE-17`  | Chưa khoá tạm tài khoản sau N lần đăng nhập sai                    | 4h        |     ✅     |
| `BE-18`  | Logger tự viết, chưa xuất JSON có cấu trúc                         | 3h        |     ✅     |
| `BE-19`  | Chưa có CRUD `folders`                                             | 6h        |     ✅     |
| `FE-04`  | Chưa có loading skeleton                                           | 3h        |     ✅     |
| `FE-05`  | Chưa dùng `next/image`                                             | 2h        |     ✅     |
| `FE-06`  | Chưa có metadata SEO từng trang                                    | 3h        |     ✅     |
| `OPS-04` | Chưa có `.nvmrc` / `engines`                                       | 15m       |     ✅     |

---

## 🔒 Bảo mật

Chi tiết: [docs/07 · Bảo mật](docs/07-bao-mat.md).

- [x] bcrypt cost 12, mật khẩu ≥ 8 ký tự
- [x] JWT ngắn hạn + refresh rotation
- [x] Cookie `httpOnly` + `secure` (theo env)
- [x] Token luôn lưu sha256 (magic link · reset · refresh)
- [x] Rate limit endpoint nhạy cảm
- [x] `helmet` + CORS whitelist + giới hạn body 1MB
- [x] zod validate 100% input
- [x] RBAC permission-based tra DB mỗi request
- [x] Chặn tự thao tác lên chính mình + chặn shadow super_admin
- [x] Audit log thao tác nhạy cảm
- [x] Presigned URL giới hạn mime/size/TTL
- [x] Chống dò tài khoản qua email
- [x] Chống IDOR khi thu hồi session người khác
- [x] Thu hồi session sau khi đổi mật khẩu `BE-01`
- [x] `trust proxy` cho rate limit + audit IP đúng `BE-02`
- [x] Rate limit theo email (chồng lên theo IP) `BE-16`
- [x] Khoá tạm tài khoản sau 5 lần đăng nhập sai, cooldown tăng dần `BE-17`
- [ ] 2FA (TOTP) cho `super_admin` / `admin` ⬜
- [ ] Captcha sau vài lần đăng nhập sai ⬜
- [x] **HTTPS + HSTS ở production** _(14/09/2026 — dòng này trước đó ghi nhầm ⬜, đã lệch với Phase 7 (ghi đã xong); xác minh THẬT bằng `curl` vào `thuymaiflower.click`/`api.thuymaiflower.click`: HTTP redirect 308 sang HTTPS + header `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` có mặt ở cả 2 domain. Phát hiện phụ (không phải lỗ hổng): `api.thuymaiflower.click` trả **2 header HSTS trùng lặp** — 1 từ Caddy, 1 từ `helmet()` ở backend (helmet mặc định tự thêm HSTS) — dư thừa vô hại, chưa dọn)_
- [x] **Xác minh đơn qua cuộc gọi điện thoại (admin ghi nhận)** _(14/09/2026 — thay cho OTP SMS tự động (cần dịch vụ SMS gateway trả phí bên ngoài); admin gọi thật, hệ thống ghi nhận + CHẶN backend: chuyển đơn sang "Đã xác nhận" đòi `Order.callConfirmedAt` có giá trị (409 `ORDER_CALL_NOT_CONFIRMED` nếu chưa), dùng LẠI permission `orders.update_status`; lịch sử nhiều lần gọi qua AuditLog chung, không bảng riêng — xem [docs/modules/domain-orders.md §11](docs/modules/domain-orders.md))_
- [ ] Xác thực email trước khi thanh toán ONLINE ⬜ _(chưa cần — hiện chỉ COD, xem docs/07 §1)_
- [ ] Dependency scanning + gitleaks trong CI ⬜
- [x] Nén + mã hoá backup (RSA/AES-256-GCM) `OPS-02`

---

## 📅 Kỳ hiện tại (10/09 – 23/09/2026)

| Việc                                                                                      | Ước lượng |                                              Trạng thái                                              |
| ----------------------------------------------------------------------------------------- | --------- | :--------------------------------------------------------------------------------------------------: |
| Sửa 6 điểm 🔴 nợ kỹ thuật (`BE-01` → `BE-06`)                                             | 1.5 ngày  |                     ✅ _(10/09/2026 — xem `docs/12-danh-gia-va-de-xuat.md` §2)_                      |
| Thiết lập CI/CD GitHub Actions                                                            | 2 ngày    |                                ✅ _(14/09/2026 — chi tiết ở Phase 6)_                                |
| **Module Products** (CRUD + nhiều ảnh, không tồn kho)                                     | 6 ngày    |             ✅ _(10/09/2026 — bao gồm `product_variants` (size/giá riêng), xem Phase 5)_             |
| **Cart + Orders (giai đoạn cơ bản)** — làm sớm hơn kế hoạch, ngoài phạm vi kỳ này ban đầu | —         | ✅ _(10/09/2026 — guest checkout, COD, chưa thanh toán online, xem `docs/modules/domain-orders.md`)_ |
| Màn hình tra cứu Audit Log                                                                | 1 ngày    |                             ✅ _(11/09/2026 — `/superadmin/audit-logs`)_                             |

**Mốc cuối kỳ**: nhập được sản phẩm thật vào hệ thống qua khu quản trị — **đã vượt mốc**: khách đã đặt
được hàng thật (giỏ hàng → thanh toán COD → xác nhận) và cửa hàng xử lý được đơn qua `/admin/orders`.

---

## 📌 Cần khách hàng quyết định

Chi tiết: [docs/gitbook/07-trao-doi.md](docs/gitbook/07-trao-doi.md).

| #   | Nội dung                                                  | Hạn            | Trạng thái |
| --- | --------------------------------------------------------- | -------------- | :--------: |
| Q1  | Chọn cổng thanh toán (VNPay / Momo / cả hai)              | **30/09/2026** |   ⏳ chờ   |
| Q2  | Tên miền website                                          | **30/09/2026** |   ⏳ chờ   |
| Q3  | Chính sách giao hàng (khu vực, phí, khung giờ, đặt trước) | **31/10/2026** |   ⏳ chờ   |
| Q4  | Dữ liệu sản phẩm mẫu (10–20 loại hoa + ảnh)               | **15/10/2026** |   ⏳ chờ   |

---

## 🔄 Nhịp cập nhật

| Việc                             | Tần suất         | Ai làm        |
| -------------------------------- | ---------------- | ------------- |
| Tick hạng mục hoàn thành         | Mỗi PR merge     | Dev thực hiện |
| Cập nhật trạng thái phase        | Cuối mỗi tuần    | Dev           |
| Đồng bộ sang tài liệu khách hàng | Hai tuần một lần | Dev           |
| Rà soát nợ kỹ thuật              | Cuối mỗi phase   | Cả nhóm       |

---

## 🧭 Lộ trình cải thiện theo review-source (review 24/09/2026)

> Phần này do skill `review-fullstack-js` thêm vào; **toàn bộ nội dung phía trên giữ nguyên**.
> Mã trong phần này (`SEC-01`, `FE-01`, `BE-01`...) tham chiếu
> [`review-source/02-VAN-DE-VA-RUI-RO.md`](review-source/02-VAN-DE-VA-RUI-RO.md) và **KHÁC** hệ mã
> cùng tên trong `docs/12` / bảng "Nợ kỹ thuật" phía trên. Chỗ nào trùng chủ đề đều ghi "docs/12 …".
> Ký hiệu: `[x]` xong · `[~]` đang làm · `[ ]` chưa làm.

### Trạng thái hiện tại

- Cập nhật lần cuối: 2026-09-25
- Mốc code được review: commit `bdf8d99` (HEAD của `main`/`review` lúc checkout)
- Giai đoạn đang thực hiện: P0 — Khẩn cấp **XONG 7/8, còn 1 việc nhỏ** (rule ESLint `no-console` của CODE-01) → sắp chuyển sang P1
- Điểm review gần nhất: **7,25/10 (Khá)** — xem [`review-source/`](review-source/00-MUC-LUC.md)
- Thống kê vấn đề còn mở: Critical 0 · High 6 · Medium 33 · Low 22 *(số cũ lúc review — chưa đếm lại sau khi các mục P0 dưới đây đã fix)*
- Ghi chú:
  - **SEC-04 đã xử lý xong hoàn toàn** (25/09/2026, docs/12 BE-28) — cả code lẫn thao tác VPS thật: phát hiện VPS trước đó CHƯA cấu hình khoá (biến để trống), 5 backup đang công khai/chưa mã hoá đã bị xoá, đã sinh khoá mới + deploy + xác nhận worker khởi động thành công. Không có dữ liệu khách hàng thật bị ảnh hưởng.
  - ~~Tại thời điểm review, working tree có thay đổi chưa commit...~~ — đã commit và merge (`676ae9e`), đối chiếu lại "Hoàn thành khi" từng mục P0 bên dưới bằng test thật.

### P0 — Khẩn cấp

Gồm lỗi Critical tiềm ẩn và các lỗi High đang gây hại cho người dùng thật.

- [x] [SEC-04] Kiểm tra production đã đặt `BACKUP_ENCRYPTION_PUBLIC_KEY` chưa; kiểm tra các file `backups/*.dump` đã upload TRƯỚC KHI có bản vá có đang công khai không *(25/09/2026 — VPS trước đó CHƯA cấu hình khoá (biến tồn tại nhưng để trống); sinh cặp khoá RSA 4096-bit, điền khoá công khai vào `backend/.env`. Kiểm tra qua Cloudinary Admin API (`type: "upload"`, prefix `backups/`): phát hiện **5 backup đang công khai, chưa mã hoá** (15-23/09/2026) — đã xoá sạch cả 5. Xác nhận không có dữ liệu khách hàng thật bị ảnh hưởng (chỉ tài khoản test/seed) nên không cần bắt buộc đổi mật khẩu người dùng. Deploy code mới (`git pull` + `docker compose build && up -d`) — log xác nhận `worker` khởi động thành công với khoá đã cấu hình, cron `backupDatabase` đăng ký lại bình thường)*
- [x] [SEC-04] `env.ts` bắt buộc khoá backup khi `NODE_ENV=production` và `RUN_JOBS=true`; upload với `type: "authenticated"`; truyền mật khẩu DB qua `PGPASSWORD` *(25/09/2026 — worker thiếu khoá không khởi động được; backup mới upload không còn công khai; mật khẩu DB không còn lộ qua `ps aux`; 3 việc xác nhận qua 5 test thật (`env.test.ts` +3, `backupDatabase.dump.test.ts` +2) — xem docs/12 BE-28)*
- [~] [CODE-01] Xoá 7 `console.log` DEBUG (`proxy.ts`, `lib/redirect.ts`, `login/page.tsx`) — **đã xoá** (`grep -rn "DEBUG" frontend/src` rỗng, xác nhận 24/09/2026); còn thiếu ESLint `no-console` để chặn log mới lọt vào — Hoàn thành khi: lint chặn `console.log` mới
- [x] [SEC-01] Tách "thu hồi do xoay vòng" (cột `rotatedAt`) khỏi thu hồi hợp lệ; reuse detection chỉ xét token đã xoay vòng *(24/09/2026 — xác nhận qua 2 test thật: "token ĐÃ XOAY VÒNG được gửi lại → 401 + thu hồi toàn bộ session" và "token bị thu hồi HỢP LỆ (đăng xuất thiết bị) → 401 nhưng KHÔNG thu hồi phiên khác" — `backend/tests/integration/auth.routes.test.ts`, xem docs/12 BE-25)*
- [x] [SEC-02] `/auth/refresh` lỗi 401/403 thì `clearAuthCookies`; lỗi 500 giữ cookie *(24/09/2026 — 3 test thật: `SESSION_EXPIRED`/`ACCOUNT_BLOCKED` xoá cả 2 cookie đúng Path; lỗi hệ thống 500 GIỮ cookie — `auth.routes.test.ts`)*
- [x] [ERR-01] Interceptor axios reject từng request trong hàng đợi khi refresh lỗi *(24/09/2026 — test "MỌI request đang xếp hàng chờ refresh đều bị reject, không treo promise" — `frontend/tests/unit/axios.test.ts`, xem docs/12 FE-09)*
- [x] [FE-01] Phiên chết (refresh 401/403) thì đặt `['account','me'] = null`, đưa về `/login` nếu đang ở route cần đăng nhập; AdminShell chỉ tin `isSuccess` *(24/09/2026 — `useSessionExpiredHandler()` mới ở `providers.tsx`, test trong `session-expiry.test.tsx`)*
- [x] [FE-02] `useSearchParams` + `<Suspense>` thay cho `window.location`; chỉ điều hướng khi `/me` vừa fetch thành công; điều hướng cứng (`hardRedirect`, tải lại trang thật — né Next.js Router Cache giữ redirect cũ) sau khi đăng nhập *(24/09/2026 — test "đăng nhập bằng form → về đúng ?redirectTo" — `session-expiry.test.tsx`; đây chính là nguyên nhân gốc của bug "hết token → chọn trang khác → về nhầm trang chủ" báo cáo thật trong phiên làm việc 18-24/09, xem docs/12 FE-08)*

### P1 — Lưới an toàn

- [ ] [OPS-01] Bật branch protection cho `main` (CI xanh + review); làm việc trên nhánh tính năng — Hoàn thành khi: push thẳng lên `main` bị từ chối
- [ ] [OPS-01] CI: chạy E2E luồng auth trên PR; thêm bước `npm run build` cho backend — Hoàn thành khi: PR hiển thị job e2e + build backend
- [ ] [TEST-01] Test luồng phiên phía client: component test Nav khi phiên chết; E2E xoá cookie `access_token` rồi bấm Link — Hoàn thành khi: các test này **đỏ** trên `bdf8d99` và **xanh** sau khi sửa P0
- [ ] [TEST-02] Sửa test reuse detection để phân biệt thu hồi hợp lệ với xoay vòng; thêm DB test (Testcontainers) cho rollback đặt hàng và race coupon — Hoàn thành khi: `npm run test:db` có các case này
- [ ] [DOC-01] Tạo `frontend/.env.example` (mô tả từng biến theo CLAUDE.md §4), thêm `!.env.example` vào `frontend/.gitignore`, sửa quick start — Hoàn thành khi: người mới clone làm theo README chạy được frontend

### P2 — Nền tảng backend

- [ ] [ERR-02] `errorHandler` map lỗi body-parser: `entity.parse.failed` → 400, `entity.too.large` → 413; thêm guard `headersSent` — Hoàn thành khi: integration test gửi JSON hỏng nhận 400
- [ ] [ERR-03] Logger truyền `Error` qua key `err` — Hoàn thành khi: test kiểm log JSON của lỗi 500 có `message` + `stack`
- [ ] [ERR-04] `unhandledRejection`/`uncaughtException`; `.catch` cho mọi cron; `io.close()` khi shutdown — Hoàn thành khi: SIGTERM thoát với mã 0 trong < 10 giây khi có socket đang mở
- [ ] [SEC-06] Factory rate limiter dùng chung; thêm limiter cho refresh, magic-link verify, `/coupons/validate`, tra đơn, presign, đổi mật khẩu; chặn `DISABLE_RATE_LIMIT` ở production — Hoàn thành khi: test 429 cho các endpoint mới
- [ ] [CODE-02] Gom `ensureUniqueSlug`, phân trang, `assertNoCycle`, trích token, thu hồi session về `shared/` — Hoàn thành khi: mỗi helper chỉ còn 1 định nghĩa, toàn bộ test pass
- [ ] [BE-02] `errorCodes.ts` + shape lỗi thống nhất (validate có `code`); frontend `lib/errors.ts` đọc được cả 2 shape trong giai đoạn chuyển — Hoàn thành khi: không còn chuỗi mã lỗi literal trong `new AppError(`
- [ ] [ARCH-01] Chuyển job + template nhắc lịch vào `modules/domain/specialDates`; `server.ts` đăng ký realtime qua 1 hàm; domain import qua `index.ts` — Hoàn thành khi: `grep -rn "specialDate" backend/src/modules/core backend/src/jobs` rỗng
- [ ] [ARCH-02] Sửa comment "scale an toàn" trong `docker-compose.yml` cho đúng thực tế — Hoàn thành khi: comment ghi rõ điều kiện (Redis adapter + store) trước khi scale

### P3 — Sửa theo từng module backend

- [ ] [SEC-03] auth: liên kết Google/magic link vào tài khoản `emailVerifiedAt = null` thì xoá `passwordHash` + thu hồi phiên + đặt `emailVerifiedAt`; chuẩn hoá email chữ thường (SEC-10) — Hoàn thành khi: test pre-hijacking pass
- [ ] [SEC-05] files: kiểm `publicId` bắt đầu bằng `uploads/`; `setEntityFile` kiểm `uploadedBy` + MIME ảnh — Hoàn thành khi: test member gửi `publicId` lạ nhận 403/422, không có lời gọi purge
- [ ] [SEC-07] seed: tách seed bắt buộc và seed mẫu (chặn ở production); không in mật khẩu; sửa `docs/10` — Hoàn thành khi: `NODE_ENV=production npm run seed:domain` không tạo coupon/sản phẩm mẫu
- [x] [VAL-01] coupons: validate lại sau khi merge bản ghi hiện tại; `computeDiscount` luôn ≤ subtotal *(25/09/2026 — bug tài chính thật, không phải lý thuyết: `PATCH {value: 500}` lên mã percent có sẵn không gửi kèm `type` từng lọt qua zod, giảm giá gấp 5 lần đơn hàng; xem docs/12 BE-27)*
- [ ] [ERR-05] orders: bắt buộc `variantId` khi sản phẩm có biến thể; bảng `ALLOWED_TRANSITIONS`; hoàn lượt coupon khi huỷ; sinh mã đơn trong transaction + retry — Hoàn thành khi: test cho từng quy tắc
- [ ] [CODE-03] orders: tách `create` thành các hàm < 60 dòng — Hoàn thành khi: test orders hiện có vẫn pass
- [ ] [DB-02] products: kiểm trùng slug tính cả bản ghi đã xoá mềm (hoặc partial unique index) — Hoàn thành khi: tạo lại sản phẩm trùng tên với sản phẩm đã xoá thành công
- [ ] [DB-03] products/addresses: validate toàn bộ id trước khi ghi, gói phần ghi vào `$transaction` — Hoàn thành khi: occasion sai không để lại sản phẩm dở dang (có DB test)
- [ ] [DB-04] files: chặn xoá file đang có usage; job dọn xoá DB trước rồi mới xoá Cloudinary — Hoàn thành khi: test job không purge file còn usage
- [ ] [DB-01] Chuyển các cột trạng thái sang Prisma `enum` (hoặc CHECK) — Hoàn thành khi: migration áp được trên bản sao DB production
- [ ] [DB-05] Thêm index cho `orders.created_at`, các cột `expires_at`, `email_logs`, `reviews.user_id` — Hoàn thành khi: migration mới + `EXPLAIN` dùng index
- [ ] [DB-06] CI chạy `prisma migrate diff --exit-code` — Hoàn thành khi: schema lệch migration thì CI đỏ
- [ ] [DB-07] FK cho `userId` của bảng token; ghi chính sách xoá mềm/xoá cứng vào docs/05 — Hoàn thành khi: migration + docs cập nhật
- [ ] [SEC-09] orders: `authorize` "một trong các quyền" ở route đổi trạng thái; thu hồi phiên khi khoá user — Hoàn thành khi: member không có quyền nhận 403 trước 404
- [ ] [BE-03] Sửa thứ tự mount `/account` để `authenticate` chỉ chạy 1 lần — Hoàn thành khi: test đếm số lần gọi `loadUserRolesAndPermissions` = 1

### P4 — Frontend

- [ ] [ARCH-03] Cookie gợi ý phiên (không nhạy cảm) cho `proxy.ts`, hoặc refresh chủ động trước khi hết hạn; chỉ gọi `useMe` ở trang công khai khi có gợi ý — Hoàn thành khi: nhàn rỗi > 5 phút rồi bấm Link không còn thoáng qua `/login`
- [ ] [FE-04] Component `QueryState` (loading / error + thử lại / empty) cho mọi trang danh sách — Hoàn thành khi: API 500 hiển thị thông báo lỗi, không hiện "Chưa có dữ liệu"
- [ ] [FE-09] `confirmDialog` cho huỷ đơn, khoá user, reset mật khẩu, đổi role, thu hồi phiên — Hoàn thành khi: mọi thao tác phá huỷ đều có hộp xác nhận
- [ ] [FE-03] Tách `ProductForm`/`ProductRow` vào `features/domain/products/components`, rồi categories, blog (3 trang đầu) — Hoàn thành khi: mỗi page < 200 dòng; form tạo/sửa dùng chung 1 component
- [ ] [VAL-03] Checkout dùng RHF + zod (`orders.schemas.ts`) + `setError` từ lỗi 422; thêm `noValidate` cho login/magic-link/forgot-password — Hoàn thành khi: lỗi hiển thị đúng field, không còn tooltip gốc của trình duyệt
- [ ] [FE-05] `src/types/api.ts` (`ApiResponse<T>`, `Paginated<T>`); types theo feature; service unwrap nhất quán — Hoàn thành khi: `PaginationMeta` chỉ còn 1 định nghĩa, không còn `AxiosResponse<any>`
- [ ] [FE-06] [FE-07] Key factory theo feature + bổ sung invalidate chéo (đổi mật khẩu → sessions, role → users/me, đơn → dashboard...) — Hoàn thành khi: không còn literal `queryKey` ngoài file `*.keys.ts`
- [ ] [FE-08] a11y: dùng `FormField` cho mọi input; `role="dialog"` + `aria-modal` + focus trap cho ConfirmDialog; `aria-live` cho Toaster; bật `jsx-a11y/recommended` — Hoàn thành khi: lint a11y không còn lỗi
- [ ] [ERR-07] Settle promise confirm cũ; `catch` cho các vòng upload; `version` + `migrate` cho cart persist — Hoàn thành khi: có test cho store
- [ ] [FE-10] Token màu danger/warning/success; bỏ `#ec4899` và `CATEGORY_COLORS` lặp — Hoàn thành khi: `grep -rn "red-6\|#ec4899" frontend/src` rỗng
- [ ] [FE-11] `next/dynamic` cho HeroPetals; debounce search; phân trang cho products/blog/coupons/newsletter; `isPending` theo từng hàng — Hoàn thành khi: không còn `limit: 100` cứng

### P5 — Hoàn thiện

- [ ] [DOC-02] Sửa các tài liệu lệch code: README (số test, Phase 7), backend/frontend README, `docs/01 §3.2`, `docs/modules/core-auth.md`, `docs/12` (FE-08, câu "không còn nợ mở"), comment trong `docker-compose.yml` — Hoàn thành khi: từng mục trong DOC-02 đã được đối chiếu
- [ ] [TEST-03] E2E luồng mua hàng: giỏ hàng → checkout COD → trang đơn — Hoàn thành khi: chạy trong CI
- [ ] [SEC-08] [SEC-11] [SEC-12] Bỏ `userId` khỏi select công khai; token huỷ đăng ký newsletter; `noindex` trang đơn; guard môi trường cho Swagger; pin `HS256`; CSP; sanitize `category.description` — Hoàn thành khi: mỗi mục có test hoặc kiểm tra header
- [ ] [VAL-02] [ERR-06] Kiểm ngày theo lịch (không chỉ regex); `page.max()`; chốt múi giờ nghiệp vụ `Asia/Ho_Chi_Minh` — Hoàn thành khi: `2026-02-31` trả 422
- [ ] [CODE-04] [CODE-05] [CODE-06] Rút gọn comment kiểu nhật ký; Prettier chung ở gốc (thống nhất kiểu nháy, gồm cả `e2e/`); dọn dead code/file `.design` bị track; TODO kèm mã — Hoàn thành khi: `format:check` quét cả `e2e/`
- [ ] [OPS-02] `package.json` gốc (npm workspaces + `concurrently`), `.editorconfig`, husky + lint-staged — Hoàn thành khi: `npm run dev` ở gốc chạy được cả hai app
- [ ] [OPS-03] `/health` kiểm DB; image frontend `output: standalone` + healthcheck; compose `condition: service_healthy` — Hoàn thành khi: dừng Postgres thì healthcheck backend báo unhealthy
- [ ] [DOC-03] `docs/user-guide.md` cho admin/florist/khách — Hoàn thành khi: có hướng dẫn các thao tác chính theo từng vai trò
- [ ] [BE-01] Chuyển backend sang ESM (`NodeNext`) trong PR riêng, làm sau cùng — Hoàn thành khi: không còn `"module": "CommonJS"`, toàn bộ test + build pass

### Không nên làm lúc này

- Viết lại hoặc đổi framework (NestJS, NextAuth...) — lý do: kiến trúc đã gần chuẩn, lỗi nằm ở chi tiết
- Tách microservice / message queue — lý do: quy mô 1 cửa hàng, 1 instance (YAGNI)
- Thêm Redis ngay — lý do: chưa scale; chỉ cần sửa comment (ARCH-02). Làm khi thật sự chạy > 1 instance
- `packages/shared` dùng chung zod schema FE/BE — lý do: hai phía có mục đích khác nhau
- Viết `useCrudPage`/`BaseService` generic trước khi tách tay 3 trang — lý do: trừu tượng hoá sớm (rule-of-three)
- Đặt mục tiêu coverage % — lý do: ưu tiên test đúng điều kiện thật cho luồng rủi ro cao

### Quyết định đã chốt

- _(Chưa có quyết định mới nào được người dùng/giảng viên xác nhận trong lần review này. Quy ước đã chốt của dự án nằm ở `CLAUDE.md`.)_

### Lịch sử review

- 2026-09-24 — review-fullstack-js (chế độ đầy đủ, mốc `bdf8d99`): 7,25/10 (Khá), 61 vấn đề (Critical 0 · High 6 · Medium 33 · Low 22)

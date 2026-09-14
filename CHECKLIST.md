# ✅ CHECKLIST — Theo dõi tiến độ dự án FLOWER

> **Cập nhật lần cuối: 11/09/2026**
> Cập nhật file này **mỗi lần merge PR**. Tiến độ dạng khách hàng đọc được: [docs/gitbook/03-tien-do.md](docs/gitbook/03-tien-do.md).

| Ký hiệu | Nghĩa |
|:---:|---|
| ✅ | Xong — đã code, **đã có test**, đã cập nhật tài liệu |
| 🟡 | Đang làm dở |
| ⬜ | Chưa bắt đầu |

> ⚠️ Chỉ tick ✅ khi đủ **Definition of Done** ở [docs/11 §3](docs/11-quy-trinh-phat-trien.md#3-definition-of-done--điều-kiện-coi-là-xong).
> "Code xong nhưng chưa test / chưa có tài liệu" là 🟡.

---

## 📊 Tổng quan

| Phase | Nội dung | Trạng thái | Tiến độ |
|:---:|---|:---:|---|
| 1 | Foundation — TS strict, error/response chuẩn, API versioning | ✅ | ██████████ 100% |
| 2 | Authentication — 3 phương thức, session, rotation | ✅ | ██████████ 100% |
| 3 | RBAC — users, roles, permissions, audit log | ✅ | ██████████ 100% |
| 4 | Infrastructure — Cloudinary, email, jobs, settings | ✅ | ██████████ 100% |
| 5 | Domain — nghiệp vụ shop hoa | 🟡 | ██████████ 96% |
| 6 | Quality — testing, OpenAPI, logging | 🟡 | ████████░░ 86% |
| 7 | Production — Docker, CI/CD, monitoring | 🟡 | █████░░░░░ 55% |

**Tổng thể: ~52%** · Số test đang chạy: **1047** (BE 900 · FE 147) + ~30 kịch bản E2E

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
- [x] **Prettier** — `BE-08` 🟡 *(mỗi package 1 `.prettierrc.json` khớp quy ước đa số sẵn có, xem docs/12)*

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
- [x] **Màn hình tra cứu Audit Log** *(11/09/2026 — `/superadmin/audit-logs`, lọc theo loại đối tượng/khoảng ngày, chi tiết before/after dạng JSON, xác nhận thật với 130 bản ghi audit log trên DB dev)*
- [x] **Row-level check** cho module domain *(11/09/2026 — `GET /api/v1/account/orders`, lọc `userId = req.user.id` ngay trong query, xác nhận thật với 2 tài khoản trên DB dev; hàng đợi giao hàng `shipper` còn lại, cần bảng `order_deliveries` trước — xem docs/12 §5.1)*

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
- [x] CRUD `folders` *(`BE-19`)*
- [x] **Màn hình quản lý tài nguyên** (cây thư mục lazy-load, xem file dạng lưới/danh sách) *(11/09/2026 — `/admin/resources`, xem [docs/modules/core-files.md §8](docs/modules/core-files.md))*
- [x] **Mở rộng `system_settings` key-value tổng quát** *(11/09/2026 — `site_name`/`site_logo`/`timezone`/`registration_enabled`, UI `/superadmin/settings`; `registration_enabled` có enforcement thật ở `auth.service.ts`; phát hiện VÀ xử lý luôn `BE-20` khi làm (nối lại đăng ký qua magic link) — xem [docs/12](docs/12-danh-gia-va-de-xuat.md); CHƯA làm `maintenance_mode` — cần middleware riêng, xem [docs/modules/core-settings.md §4](docs/modules/core-settings.md))*
- [x] Nén + mã hoá backup *(`OPS-02` — `pg_dump --compress=9` + RSA/AES-256-GCM khi có `BACKUP_ENCRYPTION_PUBLIC_KEY`; còn thiếu tách bucket/tài khoản Cloudinary riêng — việc vận hành, xem docs/12)*

## Phase 5 — Domain 🟡

- [x] **Categories** — CRUD cây, slug tự sinh bỏ dấu, chống vòng lặp cha-con
- [x] API công khai `/categories` (không lộ trường nội bộ)
- [x] UI `/admin/categories`
- [x] **Products** — CRUD, giá, thư viện nhiều ảnh, mô tả rich text (TipTap, sanitize XSS ở backend), soft delete *(không có tồn kho — hoa tươi làm theo đơn)*
- [x] **`product_variants` (size/giá riêng)** *(11/09/2026 — bảng quan hệ riêng, KHÔNG có tồn kho (cùng triết lý `basePrice`); đồng bộ theo kiểu thay thế toàn bộ danh sách nhưng GIỮ NGUYÊN `id` của biến thể đang sửa (tránh vỡ `order_items.variant_id` của đơn cũ); `orders.service.ts` chống IDOR — kiểm tra `variantId` thật sự thuộc `productId` gửi lên; giỏ hàng/checkout gộp dòng theo `(productId, variantId)`; UI chọn size ở trang chi tiết sản phẩm + quản lý biến thể ở `/admin/products` — xem [docs/modules/domain-products.md §8](docs/modules/domain-products.md))*
- [x] API công khai `/products` (phân trang, không lộ trường nội bộ)
- [x] UI `/admin/products`
- [x] Trang chủ storefront (`/`) đọc danh mục/sản phẩm thật qua API công khai (Server Component, `fetch` + `revalidate: 60s`) — thay hẳn mảng dữ liệu giả cứng trong code trước đó
- [x] Dữ liệu mẫu: 4 danh mục + 8 sản phẩm qua `domain.seed.ts` (chưa có ảnh — seed script không tự upload Cloudinary được, hiện icon hoa thay thế)
- [x] Trang danh mục (`/danh-muc/[slug]`) + trang chi tiết sản phẩm (`/san-pham/[slug]`) — API công khai `GET /products/:slug`, gallery đổi ảnh, sản phẩm liên quan cùng danh mục, CTA gọi/Zalo
- [x] **Occasions (dịp lễ)** *(12/09/2026 — tag phẳng (không cây), n-n với sản phẩm qua `product_occasions`; dùng LẠI permission `categories.manage` (không tách permission riêng); xoá occasion KHÔNG chặn dù còn sản phẩm gắn tag (`onDelete: Cascade` chỉ gỡ tag, khác categories chặn xoá khi còn con); UI `/admin/occasions` + chọn nhiều dịp lễ (pill) ở form sản phẩm + trang storefront `/dip-le/[slug]` + chip dịp lễ ở trang chi tiết sản phẩm — xem [docs/modules/domain-occasions.md](docs/modules/domain-occasions.md))*
- [x] **Cart (guest cart)** — lưu phía client (Zustand + localStorage), KHÔNG có bảng `carts` ở backend *(quyết định kiến trúc — xem [docs/modules/domain-orders.md §1](docs/modules/domain-orders.md))*
- [x] **Orders + chọn ngày giờ giao** — giai đoạn cơ bản: guest checkout, COD, cửa hàng xác nhận qua điện thoại *(chưa thanh toán online — xem [docs/modules/domain-orders.md §8](docs/modules/domain-orders.md))*
- [x] Trang giỏ hàng (`/gio-hang`) + checkout (`/thanh-toan`) + xác nhận đơn công khai (`/don-hang/[id]`, `id` UUID làm token tra cứu)
- [x] UI `/admin/orders` — lọc theo trạng thái, mở rộng xem chi tiết, đổi trạng thái (quyền theo giá trị `status`, đúng ma trận docs/05 §2.4)
- [x] **Sổ địa chỉ người nhận** *(12/09/2026 — thuần dữ liệu cá nhân, KHÔNG permission riêng (chỉ cần đăng nhập, giống `/account/profile`); địa chỉ đầu tiên tự động mặc định; mọi thao tác theo `id` chống IDOR (`where: {id, userId}`); tích hợp autofill ở trang thanh toán qua dropdown "Chọn từ sổ địa chỉ" — xem [docs/modules/domain-addresses.md](docs/modules/domain-addresses.md))*
- [ ] Payments online (VNPay/Momo) ⬜ *(7 ngày — hiện chỉ COD)*
- [x] **Lịch giao hoa theo ngày (dashboard riêng cho florist)** *(12/09/2026 — permission RIÊNG `orders.view_delivery_queue` (florist có, KHÔNG có `orders.view_all`); trang `/admin/orders/delivery-queue`, sidebar rút gọn còn đúng 1 link khi user chỉ có role florist (không kiêm admin); không có nút "Huỷ đơn" (florist không có `orders.cancel`) — xem [docs/modules/domain-orders.md §4b](docs/modules/domain-orders.md))*
- [x] **Reviews + wishlist** *(12/09/2026 — reviews cần duyệt (`isApproved` mặc định false, permission `reviews.moderate` riêng), mỗi user 1 đánh giá/sản phẩm; wishlist là bảng nối n-n thuần, idempotent thêm/xoá; phát hiện và sửa 1 bug hydration mismatch thật khi build (`ProductReviews.tsx` — xem [docs/modules/domain-reviews.md §4](docs/modules/domain-reviews.md)) — xem thêm [docs/modules/domain-wishlist.md](docs/modules/domain-wishlist.md))*
- [x] **Promotions / coupons** *(12/09/2026 — 1 đơn tối đa 1 mã (`CouponUsage.orderId` unique); `usedCount` đếm sẵn (denormalized), tăng ATOMIC bằng `updateMany` có điều kiện NGAY TRONG transaction tạo đơn để chống race condition hết lượt dùng; `Order.couponCode`/`discountAmount` là snapshot (không phải FK sống), cùng triết lý `OrderItem.productName`; permission `promotions.manage` dùng LẠI (đã seed sẵn từ đầu dự án); xoá mã chặn khi `usedCount > 0` (409 `COUPON_IN_USE`, cùng mẫu `CATEGORY_HAS_CHILDREN`); UI `/admin/coupons` + tích hợp ô nhập mã ở `/thanh-toan` — xem [docs/modules/domain-coupons.md](docs/modules/domain-coupons.md))*
- [x] **Blog + newsletter** *(12/09/2026 — Blog: `publishedAt` nullable DateTime thay cho cờ `isPublished` (null = draft, có giá trị = đã/sẽ xuất bản, cho phép LÊN LỊCH xuất bản tương lai miễn phí); tái sử dụng nguyên bản `RichTextEditor`/`useUploadFile`/`sanitizeDescriptionHtml` đã có cho Products; xoá = soft delete giống Product. Newsletter: form đăng ký ở footer, chỉ giai đoạn THU THẬP email (chưa gửi campaign hàng loạt); `unsubscribe` luôn trả thành công (không xác nhận/phủ nhận email tồn tại). Cả 2 dùng LẠI permission `blog.manage` có sẵn từ đầu dự án — xem [docs/modules/domain-blog.md](docs/modules/domain-blog.md))*
- [x] **Nhắc lịch sinh nhật/kỷ niệm** *(12/09/2026 — bảng `special_dates` (label/date/remindDaysBefore), permission như `addresses`/`wishlist` (chỉ cần đăng nhập); `date` chỉ THÁNG-NGÀY có ý nghĩa (lặp lại hằng năm), năm nhập không quan trọng; job nền hằng ngày (`sendSpecialDateReminders.job.ts`) tính "ngày dịp lễ sắp tới" (năm nay/năm sau) rồi so với `remindDaysBefore`, gửi email best-effort; `lastRemindedYear` chống gửi trùng khi job chạy bù trong ngày; sửa ngày/số-ngày-nhắc tự reset `lastRemindedYear`; tab "Ngày đặc biệt" mới ở `/account` — xem [docs/modules/domain-special-dates.md](docs/modules/domain-special-dates.md))*
- [x] **Realtime trạng thái đơn (Socket.io)** *(12/09/2026 — hạ tầng tách CORE (`modules/core/realtime/realtime.service.ts` — `initSocket()`/`getIO()`, không biết gì về đơn hàng) khỏi DOMAIN (`orders.realtime.ts` — room/event/kiểm tra quyền cụ thể); 2 loại room: `order:<id>` join KHÔNG cần đăng nhập (id đóng vai trò token, cùng mô hình bảo mật của `GET /orders/:id`) và `admin:orders` PHẢI xác thực cookie + đủ `orders.view_all`/`orders.view_delivery_queue` (Socket.io không đi qua Express middleware, tự đọc thẳng header Cookie lúc handshake); `orders.service.ts` phát `order:created`/`order:status_changed` NGAY SAU khi ghi DB (không gói trong transaction); trang xác nhận đơn công khai + `/admin/orders` + `/admin/orders/delivery-queue` tự cập nhật KHÔNG cần F5 — xem [docs/modules/domain-orders.md §10](docs/modules/domain-orders.md))*
- [x] **Site Content — admin tự sửa banner Hero/hotline/Zalo/địa chỉ/giờ mở cửa** *(13/09/2026 — dùng chung bảng `system_settings` với core-settings (khác namespace key, không migration riêng); permission RIÊNG `site_content.manage` (khác `settings.manage` 🔒 chỉ super_admin) gán cho CẢ `admin` lẫn `super_admin`; route public `GET /site-content` dùng chung cho cả storefront lẫn trang quản trị đọc (không có `GET /admin/site-content` riêng); `hero_banner` theo đúng pattern `site_logo` (lưu fileId, đánh dấu `file_usages`, fallback ảnh tĩnh khi null); storefront đọc qua `getStorefrontSiteContent()` (Server Component, `revalidate: 60s`) truyền prop xuống — KHÔNG dùng React Context; UI `/admin/site-content` — xem [docs/modules/domain-site-content.md](docs/modules/domain-site-content.md))*

## Phase 6 — Quality 🟡

- [x] **Backend: 900 test** (unit + integration) — chạy **không cần database**
- [x] **Frontend: 147 test** (unit + component + hook)
- [x] **E2E Playwright: ~30 kịch bản** (auth · superadmin · account · categories)
- [x] Hạ tầng test: Prisma mock tự sinh, `loginAs()` helper
- [x] `npm run typecheck` phủ cả `src/` lẫn `tests/`
- [x] Tài liệu kỹ thuật đầy đủ — 14 doc chính + 17 module doc, 54 sơ đồ Mermaid
- [x] Script kiểm tra cú pháp Mermaid (`scripts/check-mermaid.mjs`)
- [x] Tài liệu khách hàng (GitBook) — 7 trang + cấu hình sync
- [x] **CI/CD GitHub Actions** *(14/09/2026 — `.github/workflows/ci.yml` thật, 4 job: `backend`/`frontend`/`docs` chạy mỗi PR + push `main`, `e2e` (Postgres thật + Playwright) chỉ chạy khi vào `main`. Xác nhận CHẠY XANH THẬT trên GitHub Actions (không phải suy đoán) sau khi sửa 6 bug thật do chính CI phát hiện: (1) 4 file backend chưa format Prettier; (2) `next typegen` phải chạy trước `tsc --noEmit` (kiểu `LayoutProps` Next.js tự sinh, máy dev có sẵn từ trước nên không lộ); (3) selector E2E `/đăng nhập/i` khớp nhầm nút magic-link; (4) `authLimiter` (20 req/15p/IP) làm cả suite fail dây chuyền — thêm cờ `DISABLE_RATE_LIMIT` chỉ bật ở CI (`BE-21`); (5) 2 bug UI thật: trang Hồ sơ gửi `phone: ''` thay vì `null` khiến lưu luôn lỗi 422 với user chưa có SĐT, và toàn bộ trang quản lý Danh mục thiếu `htmlFor`/`id` nên label không gắn được với input (ảnh hưởng cả screen reader thật); (6) form Đăng ký thiếu `noValidate` nên validate nguyên sinh của trình duyệt chặn mất thông báo lỗi zod. Branch protection CHƯA bật — cần tự bật thủ công trên GitHub nếu muốn chặn merge khi CI đỏ)*
- [x] **OpenAPI/Swagger sinh từ zod schema** *(`BE-12`, 11/09/2026 — `GET /docs` (Swagger UI) + `GET /openapi.json`, request sinh trực tiếp từ `*.validation.ts` (không thể lệch), 61/61 endpoint)*
- [x] Test cho `jobs/` *(cleanupOrphanFiles, cleanupExpiredTokens, backupDatabase/cleanupOldBackups, backupEncryption)*
- [ ] Integration test với PostgreSQL thật (Testcontainers) ⬜
- [x] Logger `pino` (JSON có cấu trúc) *(`BE-18`)*
- [ ] Rà soát bảo mật độc lập ⬜

## Phase 7 — Production 🟡

- [x] **`Dockerfile` backend** (multi-stage, non-root, có `pg_dump`) *(14/09/2026 — `backend/Dockerfile`, xem docs/10 §5.1 — ĐÃ build/chạy thật, xem mục "Triển khai VPS lần đầu" bên dưới)*
- [x] **`Dockerfile` frontend** (truyền `NEXT_PUBLIC_*` lúc build) *(14/09/2026 — `frontend/Dockerfile`, xem docs/10 §5.2)*
- [x] **`docker-compose.yml` + reverse proxy Caddy + TLS** *(14/09/2026 — gốc repo, Caddy tự xin TLS Let's Encrypt, tự proxy WebSocket cho Socket.io — xem docs/10 §5.3-§5.4)*
- [x] **Container `worker` cho cron** *(`OPS-01`, 14/09/2026 — cùng image `backend`, `RUN_JOBS=true`, 1 replica cố định trong `docker-compose.yml`)*
- [x] **Secret riêng cho production** (JWT, cookie, DB) *(14/09/2026 — sinh thật bằng `openssl rand`, khác hoàn toàn giá trị mẫu; Cloudinary/SMTP dùng lại tài khoản đã có sẵn từ trước)*
- [x] **HTTPS + HSTS + redirect HTTP→HTTPS** *(14/09/2026 — Caddy tự xin chứng chỉ Let's Encrypt cho `thuymaiflower.click`/`api.thuymaiflower.click`, xác nhận thật qua trình duyệt)*
- [x] **Triển khai VPS lần đầu — `thuymaiflower.click`** *(14/09/2026 — Ubuntu 22.04, xem docs/10 §5.6. Phát hiện + sửa 4 bug thật chỉ lộ ra lúc chạy thật (không phát hiện được lúc chỉ đọc/viết code): (1) quên seed dữ liệu ban đầu; (2) `prisma`/`tsx` nằm nhầm `devDependencies` khiến lệnh `migrate deploy`/seed lỗi "command not found" trong image production (`npm ci --omit=dev`); (3) Alpine thiếu gói `openssl` khiến Prisma nhận diện sai libssl, cố tải lại engine lúc container chạy bằng user non-root → crash-loop; (4) cookie đăng nhập thiếu `COOKIE_DOMAIN` nên Next.js middleware (chạy ở subdomain frontend) không đọc được cookie do backend set ở subdomain khác, đăng nhập xong vẫn bị đá về `/login`; (5) Dockerfile frontend quên copy `next.config.ts` vào giai đoạn chạy, khiến `/_next/image` chặn hết ảnh Cloudinary. Xem chi tiết từng bug ở docs/10 §5.5-§5.6)*
- [ ] Resend verify DKIM/SPF/DMARC *(hiện tạm dùng Gmail SMTP cá nhân — hoạt động được nhưng giới hạn ~500 email/ngày, dễ vào spam hơn; nên chuyển Resend + verify domain riêng sau)*
- [ ] Uptime monitor trỏ vào `/health`
- [ ] Log tập trung + cảnh báo bất thường
- [ ] Sentry (FE + BE)
- [ ] **Diễn tập khôi phục backup** *(bắt buộc trước khi mở cho người dùng thật)*
- [ ] Chạy thử tải mô phỏng cao điểm dịp lễ

---

## 🔧 Nợ kỹ thuật

Chi tiết đầy đủ: [docs/12 · Đánh giá & đề xuất](docs/12-danh-gia-va-de-xuat.md).

### 🔴 Bắt buộc trước production — ~11 giờ

| Mã | Vấn đề | Ước lượng | Trạng thái |
|---|---|---|:---:|
| `BE-01` | Đổi mật khẩu **không thu hồi phiên cũ** (cả 3 luồng) | 2h | ✅ |
| `BE-02` | Thiếu `trust proxy` → rate limit + audit IP sai sau reverse proxy | 1h | ✅ |
| `BE-03` | Không phát hiện dùng lại refresh token đã thu hồi | 4h | ✅ |
| `BE-04` | Google login không kiểm tra `email_verified` | 1h | ✅ |
| `BE-05` | Token dùng-một-lần chưa nguyên tử (race condition) | 2h | ✅ |
| `BE-06` | `roles.update` không dùng transaction → mất sạch permission nếu lỗi | 1h | ✅ |

### 🟡 Chất lượng & vận hành — ~38 giờ

| Mã | Vấn đề | Ước lượng | Trạng thái |
|---|---|---|:---:|
| `BE-07` | Lỗi Prisma (P2002/P2025/P2003) → 500 thay vì 409/404 | 2h | ✅ |
| `BE-08` | Chưa có Prettier — style không thống nhất | 2h | ✅ |
| `BE-09` | `cleanupOrphanFiles` xoá file vừa xoá mềm, không có cửa sổ 24h | 0.5h | ✅ |
| `BE-10` | `createFileRecord` không kiểm chứng `publicId` | 3h | ✅ |
| `BE-11` | `env.ts` chỉ kiểm tra tồn tại, không kiểm tra giá trị | 3h | ✅ |
| `BE-12` | Chưa có OpenAPI/Swagger | 8h | ✅ |
| `BE-13` | Token/session hết hạn tích tụ vô hạn | 3h | ✅ |
| `FE-01` | Chưa có Error Boundary → lỗi render = trang trắng | 2h | ✅ |
| `FE-02` | Hai nguồn sự thật cho user (`useAuthStore` + `useMe`) | 3h | ✅ |
| `FE-03` | ~~Comment `axios.ts` ghi "15 phút", thực tế 5 phút~~ | 5m | ✅ |
| `OPS-01` | Cron chạy trong tiến trình API → chặn scale ngang | 3h | ✅ |
| `OPS-02` | Backup chưa nén, chưa mã hoá | 4h | ✅ |
| `OPS-03` | `cleanupOldBackups` chỉ xử lý 1000 object đầu | 1h | ✅ |

### 🟢 Cải thiện — ~24 giờ

| Mã | Vấn đề | Ước lượng | Trạng thái |
|---|---|---|:---:|
| `BE-14` | `tsconfig` khai báo `paths` không dùng, runtime không resolve | 0.5h | ✅ |
| `BE-15` | `JWT_REFRESH_EXPIRES_IN` trong `.env` nhưng code hard-code 30 ngày | 0.5h | ✅ |
| `BE-16` | Rate limit chỉ theo IP, chưa theo email | 2h | ✅ |
| `BE-17` | Chưa khoá tạm tài khoản sau N lần đăng nhập sai | 4h | ✅ |
| `BE-18` | Logger tự viết, chưa xuất JSON có cấu trúc | 3h | ✅ |
| `BE-19` | Chưa có CRUD `folders` | 6h | ✅ |
| `FE-04` | Chưa có loading skeleton | 3h | ✅ |
| `FE-05` | Chưa dùng `next/image` | 2h | ✅ |
| `FE-06` | Chưa có metadata SEO từng trang | 3h | ✅ |
| `OPS-04` | Chưa có `.nvmrc` / `engines` | 15m | ✅ |

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
- [ ] HTTPS + HSTS ở production ⬜
- [x] **Xác minh đơn qua cuộc gọi điện thoại (admin ghi nhận)** *(14/09/2026 — thay cho OTP SMS tự động (cần dịch vụ SMS gateway trả phí bên ngoài); admin gọi thật, hệ thống ghi nhận + CHẶN backend: chuyển đơn sang "Đã xác nhận" đòi `Order.callConfirmedAt` có giá trị (409 `ORDER_CALL_NOT_CONFIRMED` nếu chưa), dùng LẠI permission `orders.update_status`; lịch sử nhiều lần gọi qua AuditLog chung, không bảng riêng — xem [docs/modules/domain-orders.md §11](docs/modules/domain-orders.md))*
- [ ] Xác thực email trước khi thanh toán ONLINE ⬜ *(chưa cần — hiện chỉ COD, xem docs/07 §1)*
- [ ] Dependency scanning + gitleaks trong CI ⬜
- [x] Nén + mã hoá backup (RSA/AES-256-GCM) `OPS-02`

---

## 📅 Kỳ hiện tại (10/09 – 23/09/2026)

| Việc | Ước lượng | Trạng thái |
|---|---|:---:|
| Sửa 6 điểm 🔴 nợ kỹ thuật (`BE-01` → `BE-06`) | 1.5 ngày | ✅ *(10/09/2026 — xem `docs/12-danh-gia-va-de-xuat.md` §2)* |
| Thiết lập CI/CD GitHub Actions | 2 ngày | ✅ *(14/09/2026 — chi tiết ở Phase 6)* |
| **Module Products** (CRUD + nhiều ảnh, không tồn kho) | 6 ngày | ✅ *(10/09/2026 — bao gồm `product_variants` (size/giá riêng), xem Phase 5)* |
| **Cart + Orders (giai đoạn cơ bản)** — làm sớm hơn kế hoạch, ngoài phạm vi kỳ này ban đầu | — | ✅ *(10/09/2026 — guest checkout, COD, chưa thanh toán online, xem `docs/modules/domain-orders.md`)* |
| Màn hình tra cứu Audit Log | 1 ngày | ✅ *(11/09/2026 — `/superadmin/audit-logs`)* |

**Mốc cuối kỳ**: nhập được sản phẩm thật vào hệ thống qua khu quản trị — **đã vượt mốc**: khách đã đặt
được hàng thật (giỏ hàng → thanh toán COD → xác nhận) và cửa hàng xử lý được đơn qua `/admin/orders`.

---

## 📌 Cần khách hàng quyết định

Chi tiết: [docs/gitbook/07-trao-doi.md](docs/gitbook/07-trao-doi.md).

| # | Nội dung | Hạn | Trạng thái |
|---|---|---|:---:|
| Q1 | Chọn cổng thanh toán (VNPay / Momo / cả hai) | **30/09/2026** | ⏳ chờ |
| Q2 | Tên miền website | **30/09/2026** | ⏳ chờ |
| Q3 | Chính sách giao hàng (khu vực, phí, khung giờ, đặt trước) | **31/10/2026** | ⏳ chờ |
| Q4 | Dữ liệu sản phẩm mẫu (10–20 loại hoa + ảnh) | **15/10/2026** | ⏳ chờ |

---

## 🔄 Nhịp cập nhật

| Việc | Tần suất | Ai làm |
|---|---|---|
| Tick hạng mục hoàn thành | Mỗi PR merge | Dev thực hiện |
| Cập nhật trạng thái phase | Cuối mỗi tuần | Dev |
| Đồng bộ sang tài liệu khách hàng | Hai tuần một lần | Dev |
| Rà soát nợ kỹ thuật | Cuối mỗi phase | Cả nhóm |

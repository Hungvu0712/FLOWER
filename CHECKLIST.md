# ✅ CHECKLIST — Theo dõi tiến độ dự án FLOWER

> **Cập nhật lần cuối: 10/09/2026**
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
| 4 | Infrastructure — R2, email, jobs, settings | 🟡 | ████████░░ 80% |
| 5 | Domain — nghiệp vụ shop hoa | 🟡 | █░░░░░░░░░ 10% |
| 6 | Quality — testing, OpenAPI, logging | 🟡 | ██████░░░░ 60% |
| 7 | Production — Docker, CI/CD, monitoring | ⬜ | ░░░░░░░░░░ 0% |

**Tổng thể: ~40%** · Số test đang chạy: **435** (BE 334 · FE 101) + ~30 kịch bản E2E

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
- [ ] **Prettier** — `BE-08` 🟡 *(28 file nháy đơn vs 34 file nháy kép)*

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
- [ ] **Màn hình tra cứu Audit Log** ⬜ *(API đã có, thiếu UI — 1 ngày)*
- [ ] **Row-level check** cho module domain ⬜ *(bắt buộc trước `orders`)*

## Phase 4 — Infrastructure 🟡

- [x] Presigned upload R2 (mime whitelist, ≤10MB, TTL 5 phút, key UUID)
- [x] `file_usages` — đánh dấu tái sử dụng ảnh
- [x] Xoá mềm file
- [x] Cron dọn file mồ côi (10 ngày/lần, ngưỡng an toàn 24h)
- [x] Cron backup DB → R2 (2 ngày/lần) + tự xoá bản > 30 ngày
- [x] Email abstraction Resend / Nodemailer-SMTP (đổi qua env)
- [x] Ghi `email_logs` cho mọi lần gửi (`sent` / `failed` + `error`)
- [x] `login_method_settings` + chốt chặn ≥ 1 phương thức bật
- [ ] CRUD `folders` ⬜ *(bảng đã có, API chưa — `BE-19`)*
- [ ] Màn hình quản lý tài nguyên (cây thư mục, grid/list) ⬜
- [ ] Mở rộng `system_settings` key-value tổng quát ⬜
- [ ] Nén + mã hoá backup ⬜ *(`OPS-02` — SECURITY.md §5 yêu cầu)*

## Phase 5 — Domain 🟡

- [x] **Categories** — CRUD cây, slug tự sinh bỏ dấu, chống vòng lặp cha-con
- [x] API công khai `/categories` (không lộ trường nội bộ)
- [x] UI `/admin/categories`
- [ ] **Products** ⬜ *(6 ngày — ưu tiên tiếp theo)*
- [ ] Occasions (dịp lễ) ⬜
- [ ] Cart (guest cart) ⬜ *(4 ngày)*
- [ ] **Orders + chọn ngày giờ giao** ⬜ *(8 ngày — cốt lõi ngành hoa)*
- [ ] Sổ địa chỉ người nhận ⬜
- [ ] Payments (COD + VNPay/Momo) ⬜ *(7 ngày)*
- [ ] Quản lý đơn cho cửa hàng ⬜ *(5 ngày)*
- [ ] Lịch giao hoa theo ngày ⬜ *(3 ngày)*
- [ ] Reviews + wishlist ⬜
- [ ] Promotions / coupons ⬜
- [ ] Blog + newsletter ⬜
- [ ] Nhắc lịch sinh nhật/kỷ niệm ⬜
- [ ] Storefront: danh sách · chi tiết · giỏ hàng · thanh toán ⬜ *(13 ngày)*
- [ ] Realtime trạng thái đơn (Socket.io) ⬜

## Phase 6 — Quality 🟡

- [x] **Backend: 334 test** (252 unit + 82 integration) — chạy **không cần database**
- [x] **Frontend: 101 test** (unit + component + hook)
- [x] **E2E Playwright: ~30 kịch bản** (auth · superadmin · account · categories)
- [x] Hạ tầng test: Prisma mock tự sinh, `loginAs()` helper
- [x] `npm run typecheck` phủ cả `src/` lẫn `tests/`
- [x] Tài liệu kỹ thuật đầy đủ — 13 doc chính + 7 module doc, 67 sơ đồ Mermaid
- [x] Script kiểm tra cú pháp Mermaid (`scripts/check-mermaid.mjs`)
- [x] Tài liệu khách hàng (GitBook) — 7 trang + cấu hình sync
- [ ] **CI/CD GitHub Actions** ⬜ *(2 ngày — ưu tiên cao, mẫu ở docs/10 §6)*
- [ ] OpenAPI/Swagger sinh từ zod schema ⬜ *(`BE-12` — 1 ngày)*
- [ ] Test cho `jobs/` ⬜
- [ ] Integration test với PostgreSQL thật (Testcontainers) ⬜
- [ ] Logger `pino` (JSON có cấu trúc) ⬜ *(`BE-18`)*
- [ ] Rà soát bảo mật độc lập ⬜

## Phase 7 — Production ⬜

- [ ] `Dockerfile` backend (multi-stage, non-root, có `pg_dump`)
- [ ] `Dockerfile` frontend (truyền `NEXT_PUBLIC_*` lúc build)
- [ ] `docker-compose.yml` + reverse proxy (Caddy/Nginx) + TLS
- [ ] Tách container `worker` cho cron *(`OPS-01`)*
- [ ] Secret riêng cho production (JWT, cookie, DB, R2)
- [ ] HTTPS + HSTS + redirect HTTP→HTTPS
- [ ] Domain thật + Resend verify DKIM/SPF/DMARC
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
| `BE-01` | Đổi mật khẩu **không thu hồi phiên cũ** (cả 3 luồng) | 2h | ⬜ |
| `BE-02` | Thiếu `trust proxy` → rate limit + audit IP sai sau reverse proxy | 1h | ⬜ |
| `BE-03` | Không phát hiện dùng lại refresh token đã thu hồi | 4h | ⬜ |
| `BE-04` | Google login không kiểm tra `email_verified` | 1h | ⬜ |
| `BE-05` | Token dùng-một-lần chưa nguyên tử (race condition) | 2h | ⬜ |
| `BE-06` | `roles.update` không dùng transaction → mất sạch permission nếu lỗi | 1h | ⬜ |

### 🟡 Chất lượng & vận hành — ~38 giờ

| Mã | Vấn đề | Ước lượng | Trạng thái |
|---|---|---|:---:|
| `BE-07` | Lỗi Prisma (P2002/P2025/P2003) → 500 thay vì 409/404 | 2h | ⬜ |
| `BE-08` | Chưa có Prettier — style không thống nhất | 2h | ⬜ |
| `BE-09` | `cleanupOrphanFiles` xoá file vừa xoá mềm, không có cửa sổ 24h | 0.5h | ⬜ |
| `BE-10` | `createFileRecord` không kiểm chứng `r2Key` | 3h | ⬜ |
| `BE-11` | `env.ts` chỉ kiểm tra tồn tại, không kiểm tra giá trị | 3h | ⬜ |
| `BE-12` | Chưa có OpenAPI/Swagger | 8h | ⬜ |
| `BE-13` | Token/session hết hạn tích tụ vô hạn | 3h | ⬜ |
| `FE-01` | Chưa có Error Boundary → lỗi render = trang trắng | 2h | ⬜ |
| `FE-02` | Hai nguồn sự thật cho user (`useAuthStore` + `useMe`) | 3h | ⬜ |
| `FE-03` | ~~Comment `axios.ts` ghi "15 phút", thực tế 5 phút~~ | 5m | ✅ |
| `OPS-01` | Cron chạy trong tiến trình API → chặn scale ngang | 3h | ⬜ |
| `OPS-02` | Backup chưa nén, chưa mã hoá | 4h | ⬜ |
| `OPS-03` | `cleanupOldBackups` chỉ xử lý 1000 object đầu | 1h | ⬜ |

### 🟢 Cải thiện — ~24 giờ

| Mã | Vấn đề | Ước lượng | Trạng thái |
|---|---|---|:---:|
| `BE-14` | `tsconfig` khai báo `paths` không dùng, runtime không resolve | 0.5h | ⬜ |
| `BE-15` | `JWT_REFRESH_EXPIRES_IN` trong `.env` nhưng code hard-code 30 ngày | 0.5h | ⬜ |
| `BE-16` | Rate limit chỉ theo IP, chưa theo email | 2h | ⬜ |
| `BE-17` | Chưa khoá tạm tài khoản sau N lần đăng nhập sai | 4h | ⬜ |
| `BE-18` | Logger tự viết, chưa xuất JSON có cấu trúc | 3h | ⬜ |
| `BE-19` | Chưa có CRUD `folders` | 6h | ⬜ |
| `FE-04` | Chưa có loading skeleton | 3h | ⬜ |
| `FE-05` | Chưa dùng `next/image` | 2h | ⬜ |
| `FE-06` | Chưa có metadata SEO từng trang | 3h | ⬜ |
| `OPS-04` | Chưa có `.nvmrc` / `engines` | 15m | ⬜ |

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
- [ ] Thu hồi session sau khi đổi mật khẩu ⬜ `BE-01`
- [ ] `trust proxy` cho rate limit + audit IP đúng ⬜ `BE-02`
- [ ] 2FA (TOTP) cho `super_admin` / `admin` ⬜
- [ ] Khoá tạm sau N lần đăng nhập sai + captcha ⬜
- [ ] HTTPS + HSTS ở production ⬜
- [ ] Xác thực email trước khi đặt hàng ⬜
- [ ] Dependency scanning + gitleaks trong CI ⬜
- [ ] Mã hoá backup ⬜ `OPS-02`

---

## 📅 Kỳ hiện tại (10/09 – 23/09/2026)

| Việc | Ước lượng | Trạng thái |
|---|---|:---:|
| Sửa 6 điểm 🔴 nợ kỹ thuật (`BE-01` → `BE-06`) | 1.5 ngày | ⬜ |
| Thiết lập CI/CD GitHub Actions | 2 ngày | ⬜ |
| **Module Products** (CRUD + biến thể + nhiều ảnh + tồn kho) | 6 ngày | ⬜ |
| Màn hình tra cứu Audit Log | 1 ngày | ⬜ |

**Mốc cuối kỳ**: nhập được sản phẩm thật vào hệ thống qua khu quản trị.

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

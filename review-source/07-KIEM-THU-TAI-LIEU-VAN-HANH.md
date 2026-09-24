# 07 · Kiểm thử, tài liệu & vận hành

> Mốc review: commit `bdf8d99`. Mã vấn đề: [02](02-VAN-DE-VA-RUI-RO.md).

## Phần A — Kiểm thử

### A1. Phân loại hiện trạng: **Tốt**

Các luồng quan trọng đều có test, và test chạy trong CI.

| Bộ test | Số lượng | Chạy được? |
|---|---|---|
| Backend unit (Vitest, Prisma mock) | khoảng 617 case / 48 file | ✅ |
| Backend integration (Supertest trên `app`) | khoảng 227 case / 20 file | ✅ |
| Backend DB thật (Testcontainers `postgres:16-alpine`) | 6 case (migrate + seed + constraint) | Chạy trên CI khi vào `main` |
| Frontend unit/component (Vitest + RTL) | 149 test / 15 file | ✅ |
| Frontend E2E (Playwright) | 29 kịch bản / 4 file | Chạy trên CI khi vào `main` |

**Đã chạy thực tế ở mốc này**: `npm test` backend **929/929 pass**, frontend **149/149 pass**. Lần
chạy này diễn ra ngày 24/09/2026 khi working tree còn đúng bằng `bdf8d99`, và chỉ đọc (không cần DB).
E2E không chạy lại ở mốc này; CHECKLIST.md:141 ghi nhận CI xanh.

### A2. Đối chiếu bản đồ ưu tiên

| # | Luồng | Hiện trạng | Lỗ hổng |
|---|---|---|---|
| 1 | Auth: đăng ký, đăng nhập, refresh, đăng xuất, token hết hạn | ✅ Dày: `auth.service.test.ts` (63), `auth.routes.test.ts` (21), E2E auth | ❌ Không có test cho **refresh thất bại với nhiều request xếp hàng**, **header sau khi phiên chết**, **trang login khi điều hướng mềm** (TEST-01); test reuse detection khoá đúng hành vi sai (TEST-02) |
| 2 | Phân quyền, IDOR | ✅ `rbac.test.ts` 3 tầng; IDOR cho sessions/addresses/orders; E2E "không thu hồi được phiên người khác" | — |
| 3 | Đơn hàng / tiền / coupon | ✅ `orders.service.test.ts` (45), `orders.routes` (32), `coupons.*` | 🟡 Race coupon và rollback chỉ test trên mock, mà `$transaction` của mock không rollback (TEST-02); không test partial update coupon (VAL-01) |
| 4 | Validation trả đúng định dạng | ✅ `middleware.test.ts:124-180` | — |
| 5 | Utils thuần | ✅ hash, jwt, slugify, sanitizeHtml, backupEncryption... | — |
| 6 | Frontend: form, route guard, hook | 🟡 proxy (11), axios (9), stores, services, schemas | ❌ Không có test page; `vitest.config.ts:22` loại `src/app/**` khỏi coverage |
| 7 | E2E luồng chính | 🟡 auth, account, categories, superadmin | ❌ Không có giỏ hàng → checkout → trang đơn (TEST-03); mọi kịch bản dùng `page.goto` (tải lại cứng) |

**Bài học quan trọng nhất**: ba lỗi High ở frontend (FE-01, FE-02, ERR-01) sống sót qua gần 1.100 test
và 29 kịch bản E2E. Lý do không phải thiếu số lượng mà là **thiếu đúng điều kiện thật**: token phải
hết hạn thật (cookie bị xoá) và người dùng phải **bấm Link** (điều hướng phía client). Lần sửa FE-08
trong docs/12 ghi "không tái hiện được bằng Playwright" chính vì kịch bản thiếu hai điều kiện này.

## Phần B — Tài liệu

| Đối tượng | Mức | Nội dung hiện có | Thiếu / sai |
|---|---|---|---|
| **Developer** | **Đủ, nhưng lệch code** | README gốc có bảng điều hướng; `docs/00`→`12` đánh số theo thứ tự đọc; `docs/modules/*` (19 module); CLAUDE.md quy ước; `docs/06` API reference + Swagger sinh từ zod; `.env.example` backend mô tả **từng biến** (29/29 biến có mặt, kèm mức độ, cách lấy, hệ quả khi sai) | Thiếu `frontend/.env.example` dù quick start tham chiếu (DOC-01); số test, trạng thái tính năng, luồng auth lệch code (DOC-02) |
| **Vận hành** | **Đủ** | `docs/10` (653 dòng): Docker, compose, Caddy, backup/giải mã, Loki, UptimeRobot, migrate | Comment scale "an toàn" và `depends_on` sai (DOC-02, ARCH-02); hướng dẫn chạy `seed:domain` ở production (SEC-07) |
| **Người dùng cuối** | **Thiếu** | `docs/gitbook/` dành cho khách hàng/bên liên quan (phạm vi, tiến độ, ước lượng, rủi ro) | Chưa có hướng dẫn sử dụng theo vai trò admin/florist/khách (DOC-03, Low) |

Điểm đặc biệt: `docs/12-danh-gia-va-de-xuat.md` là **tài liệu tự đánh giá nợ kỹ thuật** có mã, mức ưu
tiên và ước lượng. Rất hiếm ở dự án học viên. Chỉ tiếc là trạng thái ✅ ở đó chưa luôn đúng (FE-08).

## Phần C — Vận hành, build, deploy, cấu trúc repo

| Hạng mục | Hiện trạng | Đánh giá |
|---|---|---|
| CI (GitHub Actions) | 4 job: `backend` (lint, typecheck, format, test), `frontend` (lint, typegen, typecheck, format, test, **build**), `docs` (kiểm Mermaid), `e2e` (chỉ khi vào `main`) | ✅ Tốt. 🟡 E2E không chạy trên PR, backend không build, không kiểm drift migration, không `npm audit` (OPS-01, DB-06) |
| Nhánh / quy trình | `main` = `review` = `bdf8d99`; commit WIP debug nằm trên `main`; branch protection chưa bật | ❌ OPS-01 |
| Docker | Multi-stage, non-root, HEALTHCHECK (backend) | ✅ — 🟡 frontend chứa devDeps, `npm` là PID 1, không có healthcheck (OPS-03) |
| Compose | postgres (healthcheck) · backend · worker (`RUN_JOBS`) · frontend · caddy; log đẩy về Loki | ✅ — 🟡 `service_started` thay vì chờ migrate |
| HTTPS | Caddy tự cấp Let's Encrypt, HSTS preload | ✅ — không có CSP (SEC-11) |
| Giám sát | Loki (log driver), UptimeRobot 2 monitor | ✅ — `/health` không kiểm DB (OPS-03) |
| Backup | `pg_dump` 2 ngày/lần → Cloudinary, mã hoá tuỳ chọn, script giải mã | 🟡 SEC-04; chưa diễn tập khôi phục (CHECKLIST) |
| Monorepo gốc | Không có `package.json` gốc/workspaces, `.editorconfig`, husky; `.nvmrc`=22 + `engines` ≥ 20.9 | 🟡 `[CHUẨN]` OPS-02 |
| `.gitignore` | Đủ `node_modules`, `.env*`, build, coverage, Playwright output | ✅ — `frontend/.gitignore:34` chặn luôn `.env.example` (DOC-01) |

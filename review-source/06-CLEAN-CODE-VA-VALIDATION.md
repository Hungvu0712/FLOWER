# 06 · Clean Code & Validation

> Mốc review: commit `bdf8d99`. Mã vấn đề: [02](02-VAN-DE-VA-RUI-RO.md).

## Phần A — Clean Code

### A1. Theo từng nguyên tắc

| Nguyên tắc | Đánh giá | Bằng chứng chính |
|---|---|---|
| **KISS** (giữ đơn giản) | ✅ Tốt | Không có trừu tượng hoá thừa: repository chỉ có 1 file, được lập luận rõ (`auth.repository.ts`); không có base class hay generic phức tạp |
| **DRY** (không lặp tri thức) | 🟡 Vi phạm lặp lại | Backend: `ensureUniqueSlug` ×4, phân trang khoảng 15 chỗ, `assertNoCycle` ×2, trích token ×3, thu hồi session ×3 (CODE-02). Frontend: khung CRUD ×9, class input ×60, `formatDateTime` ×5, `STATUS_TONE` ×3 (FE-03) |
| **Rule of three** (lặp 3 lần mới trừu tượng hoá) | 🟡 | Có comment bênh vực việc lặp (`products.service.ts:79-80`), nhưng đã 4 bản sao và **các bản đã lệch nhau → sinh bug DB-02**. Minh chứng rõ nhất cho việc vượt ngưỡng |
| **YAGNI** (không làm thứ chưa cần) | ✅ Phần lớn tốt | Docs chủ động ghi "Chưa cần Redis", "Chỉ tách StorageService khi thực sự cần". Hai điểm thừa: three.js 387 dòng cho hiệu ứng cánh hoa (FE-11) và role `sales_staff`/`shipper` đã seed nhưng chưa có giao diện (chấp nhận được vì đã có trong roadmap) |
| **SRP** (mỗi đơn vị một trách nhiệm) | 🟡 | `orders.service.create` 187 dòng (CODE-03); các trang admin 400–550 dòng gộp form, bảng, modal và upload (FE-03) |
| **Separation of Concerns** (tách mối quan tâm) | ✅ | Component không gọi API; service không chạm HTTP |
| **Fail fast** (hỏng sớm) | ✅ Tốt | `env.ts` validate cả giá trị, có kiểm riêng cho production. Chỗ còn thiếu: khoá backup (SEC-04) |
| **Least surprise** (hành vi khớp với tên) | 🟡 | `getRedirectTarget()` đọc `window.location` và log stack trace (FE-02, CODE-01); `/health` trả "ok" mà không kiểm DB (OPS-03) |

### A2. Naming và nhất quán

- ✅ `camelCase`/`PascalCase` đúng quy ước. Tên file dạng `dot.case` nhất quán (`auth.service.ts`).
  Boolean dùng tiền tố `is/has`. Không trộn tiếng Việt không dấu vào tên hàm.
- ✅ Toàn dự án dùng `async/await`; frontend chỉ dùng axios (trừ `fetch` có chủ đích ở Server Component).
- 🟡 Mã lỗi thiếu nhất quán: `NOT_FOUND` và `PRODUCT_NOT_FOUND` cho cùng một tình huống (BE-02).
  Namespace query key lẫn lộn (FE-07).
- 🟡 `app/error.tsx:12` đặt tên component là `Error`, che mất global `Error`.

### A3. Comment

Dự án có mật độ comment **rất cao**. Phần lớn giải thích **vì sao**, đúng tinh thần clean code và
đúng CLAUDE.md. Ví dụ tốt: `cookie.util.ts:49-53` giải thích tại sao path là `/api/v1` và bug từng
xảy ra khi để hẹp hơn.

Tuy vậy (CODE-04):

- **Dạng nhật ký, quá dài**: `proxy.ts:30-36`, `login/page.tsx:33-38`, `axios.ts:37-40` kể lại cả
  quá trình tìm bug. Thông tin này nên nằm ở `docs/12` và commit message; comment chỉ giữ quyết định
  và ràng buộc.
- **Comment sai lệch**: comment ở `login/page.tsx:33-38` khẳng định "chốt 1 lần lúc mount" đã sửa
  lỗi, trong khi lỗi vẫn còn (FE-02). Đây đúng là loại comment "nguy hiểm hơn không có".
- Lưu ý: CLAUDE.md của dự án **chủ trương** ghi bug vào comment. Nhận xét này không phủ nhận chủ
  trương đó; nó chỉ ra giới hạn của nó: một comment kể "đã sửa xong" sẽ thành sai ngay khi lỗi tái
  phát.

### A4. Dead code và code rác

- **Log debug bị commit** (CODE-01, Medium): 7 câu `console.log` trong `proxy.ts`, `redirect.ts`,
  `login/page.tsx`.
- **Dead code** (CODE-06): `IconDevices`, nhánh `soon` trong `DashboardShell`, SVG boilerplate trong
  `public/`, coverage exclude trỏ tới `src/config/r2.ts` đã xoá, README domain nhắc module `cart/` không
  tồn tại, file `.design` 2,5 MB bị track dù `.gitignore` loại trừ.
- **TODO không có mã theo dõi**: `ve-chung-toi/page.tsx:12`, `Footer.tsx:146`, trái CLAUDE.md §3.
- Không tìm thấy code bị comment-out. Không có import thừa (ESLint + `noUnused` giữ được).

### A5. Công cụ đảm bảo chất lượng

| Công cụ | Backend | Frontend | Ghi chú |
|---|---|---|---|
| ESLint | ✅ `typescript-eslint` recommended | ✅ `eslint-config-next` (core-web-vitals + TS) | Thiếu `no-console`, `jsx-a11y/recommended`, `@tanstack/eslint-plugin-query` (CODE-05) |
| Prettier | ✅ `singleQuote: false` | ✅ `singleQuote: true` | **Hai cấu hình lệch nhau**; không có file ở gốc; `e2e/` không nằm trong `format:check` |
| TS strict | ✅ + `noUncheckedIndexedAccess` | ✅ | Zero `any` ở cả hai phía — rất tốt |
| `typecheck` / `lint` / `format:check` trong CI | ✅ | ✅ | |
| husky / lint-staged | ❌ | ❌ | OPS-02 |

### A6. Dấu hiệu code do AI sinh thiếu kiểm soát

63/64 commit có đồng tác giả Claude. Nhận xét trung lập, tập trung vào hệ quả:

- **Tích cực**: phong cách giữa các module backend rất đồng đều; test đi kèm hầu hết các thay đổi;
  có thói quen ghi lại bug thật.
- **Hệ quả cần lưu ý**:
  - Cùng một helper được viết lại ở nhiều nơi, và các bản đã lệch nhau (CODE-02 → DB-02).
  - Mỗi trang admin tự sinh lại khung CRUD (FE-03).
  - Comment "đã sửa" nhưng chưa kiểm chứng đúng điều kiện thật (FE-02, docs/12 FE-08 ghi "không tái
    hiện được bằng Playwright").
  - Log WIP lọt vào `main` (CODE-01).
  - Tài liệu được sinh nhanh hơn tốc độ đối chiếu với code (DOC-02).

---

## Phần B — Validation

### B1. Backend

| Tiêu chí | Hiện trạng |
|---|---|
| Middleware `validate({ body, params, query })` bằng zod ở tầng route | ✅ `shared/middleware/validate.ts`; controller nhận dữ liệu đã parse, trường thừa bị loại |
| Schema đặt trong module | ✅ `modules/<x>/<x>.validation.ts` (chuẩn gọi là `.schema.ts` — chỉ khác tên) |
| Validate `params` | ✅ Mọi `:id` là `uuid()`; roles/permissions dùng số nguyên nhưng không giới hạn (VAL-02) |
| Validate `query` | ✅ `limit ≤ 100`; 🟡 `page` không có giới hạn trên (VAL-02) |
| `ZodError` → định dạng chuẩn | 🟡 422 + `errors: { field: message }`, nhưng **thiếu `code`** (BE-02) |
| Validate env bằng zod | ✅ |
| Partial update | ❌ Coupon: `refine` chỉ đúng khi đủ trường, dẫn tới tổng âm (VAL-01) |
| Ngày tháng | 🟡 Chỉ dùng regex, nên `2026-13-01` gây 500 và `02-31` bị trôi sang tháng sau (VAL-02) |

### B2. Frontend — kiểm tra từng form

| Form | Thư viện | Validate client | Lỗi server map vào field | Ghi chú |
|---|---|---|---|---|
| Đăng ký | RHF + zod | ✅ khớp backend (min 8, cùng thông điệp) | ❌ một dòng lỗi chung | `noValidate` ✅ |
| Đăng nhập | RHF + zod | ✅ | ❌ | **Thiếu `noValidate`** nên validate gốc của trình duyệt chặn thông báo zod (VAL-03) |
| Magic link, Quên mật khẩu | RHF + zod | ✅ | ❌ (không hiển thị lỗi) | Thiếu `noValidate` |
| Đặt lại mật khẩu | RHF + zod | ✅ | ❌ | |
| Hồ sơ + đổi mật khẩu | RHF + zod | ✅ | ❌ toast | Schema viết inline trong page, không nằm trong feature |
| **Checkout** (`thanh-toan`) | `useState` tự quản | ❌ | ✅ map 422 thủ công (`:157-160`) | Form doanh thu chính mà không có validate client; 8 label không gắn control |
| Liên hệ | `useState` | ❌ | ✅ map thủ công | Import `AxiosError` trong UI |
| Newsletter | `useState` | chỉ `required` gốc của trình duyệt | ❌ | |
| 9 trang CRUD admin/account | `useState`, **không có `<form>`** | chỉ `disabled={!form.name}` | ❌ toast | Không Enter-to-submit |
| Upload ảnh | Không có form | Kiểm MIME/size ở backend sau upload | — | Phía client không kiểm trước khi upload |

**Kết luận**: nền tảng validation đúng hướng (zod ở hai phía, cùng thông điệp tiếng Việt ở auth).
Frontend mới áp dụng RHF + zod cho 7/khoảng 20 form, và bỏ sót đúng form quan trọng nhất (checkout).
Theo chuẩn khoá học đây là `[CHUẨN]` Medium (VAL-03). Tuy vậy cần lưu ý: đây cũng là **vi phạm quy
ước của chính dự án** (`docs/04-frontend.md:276`).

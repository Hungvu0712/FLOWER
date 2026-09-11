# Module: Settings 🔧 Core

Hai phần: bật/tắt từng phương thức đăng nhập (`login_method_settings`, §1-§3), và cấu hình hệ thống
key-value tổng quát (`system_settings`, §4-§7, docs/12 Phase 4).

| | |
|---|---|
| **Loại** | 🔧 Core |
| **Backend** | `modules/core/settings/` |
| **Frontend** | `features/core/admin-login-methods/` · `features/core/admin-settings/` · `app/(dashboard)/superadmin/login-methods/` · `app/(dashboard)/superadmin/settings/` |
| **Bảng DB** | `login_method_settings` · `system_settings` |
| **Endpoint** | `/api/v1/superadmin/login-methods` · `/api/v1/superadmin/settings` (cả 2 cần `settings.manage` 🔒) |

---

## 1. Chốt chặn quan trọng nhất: luôn còn ≥ 1 phương thức bật

```mermaid
flowchart TD
    REQ["PATCH /login-methods/:method<br/>{ isEnabled: false }"] --> LOAD["Đọc trạng thái HIỆN TẠI<br/>của cả 3 phương thức"]
    LOAD --> CALC["Tính số phương thức còn bật<br/>SAU KHI áp thay đổi"]
    CALC --> CHECK{"≥ 1 ?"}
    CHECK -->|Không| BLOCK["🚫 400 AT_LEAST_ONE_LOGIN_METHOD_REQUIRED<br/>KHÔNG ghi DB"]
    CHECK -->|Có| SAVE["UPDATE + ghi audit log"]

    BLOCK --> WHY["Nếu không có chốt này:<br/>tắt hết = KHOÁ CỨNG toàn hệ thống<br/>kể cả super_admin cũng không vào được<br/>→ phải sửa trực tiếp trong DB để cứu"]

    style BLOCK fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style WHY fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
```

Điểm tinh tế: kiểm tra dựa trên trạng thái **sau khi áp thay đổi**, không phải trước. Đang bật 2, tắt
1 → còn 1 → hợp lệ. Đang bật 1, tắt nốt → còn 0 → chặn.

**Chốt nằm ở tầng service**, không chỉ ở UI. Test kiểm chứng bằng cách gọi thẳng API —
`backend/tests/integration/superadmin.routes.test.ts` và `frontend/e2e/superadmin.spec.ts`.

---

## 2. Ảnh hưởng tới luồng đăng nhập

```mermaid
flowchart LR
    subgraph FE["Frontend"]
        L["Trang /login"] -->|"GET /auth/login-methods<br/>(công khai)"| S1["Ẩn/hiện nút<br/>tương ứng"]
    end
    subgraph BE["Backend — chốt thật"]
        A["POST /auth/login<br/>/register<br/>/magic-link/request<br/>/google"] --> M["assertMethodEnabled()"]
        M -->|Đang tắt| E["403 LOGIN_METHOD_DISABLED"]
        M -->|Đang bật| OK["Tiếp tục"]
    end

    S1 -.->|"Người dùng vẫn có thể<br/>gọi API trực tiếp"| A

    style E fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style FE fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
```

Ẩn nút trên UI chỉ là trải nghiệm. **Backend luôn kiểm tra lại** ở mỗi luồng đăng nhập.

---

## 3. Kiểm thử

`backend/tests/unit/modules/loginMethods.service.test.ts` — 6 test: chặn tắt phương thức cuối · cho tắt
khi còn phương thức khác · bật lại luôn được · tính trạng thái sau thay đổi · 404 với phương thức lạ ·
audit log kèm before/after.

---

## 4. `system_settings` — key-value tổng quát (✅ 11/09/2026)

Bảng `system_settings` (PK là `key`, `value` JSON-encode) — **KHÔNG gộp chung** với
`login_method_settings` trong lần triển khai này (2 bảng riêng, xem §7). 4 key đã có ý nghĩa thật:

| Key | Kiểu | Enforcement |
|---|---|---|
| `site_name` | string | Chưa nơi nào đọc lại (chuẩn bị cho khi storefront cần) |
| `site_logo` | uuid (fileId) \| null | Chưa nơi nào đọc lại — có đánh dấu `file_usages` để cron mồ côi không xoá nhầm |
| `timezone` | string (IANA) | Chưa nơi nào đọc lại |
| `registration_enabled` | boolean | ✅ Có thật — chặn `POST /auth/register`, nhánh tự tạo tài khoản của `loginWithGoogle()` (Google mới) |

```mermaid
flowchart TD
    REQ["PATCH /settings/:key<br/>{ value: ... }"] --> VAL["Validate value ĐÚNG KIỂU<br/>theo key (systemSettings.validation.ts)"]
    VAL -->|Sai kiểu| E1["🚫 422 Validation failed"]
    VAL -->|site_logo| FU["setEntityFile()/clearEntityFile()<br/>đánh dấu file_usages<br/>(404 nếu fileId không tồn tại)"]
    VAL -->|key khác| SAVE
    FU --> SAVE["UPSERT system_settings<br/>+ ghi audit log"]

    style E1 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style SAVE fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**site_logo lưu fileId, không lưu URL trực tiếp** — giữ đúng quy ước tham chiếu file của phần còn lại
hệ thống (`avatarFileId`, `imageFileId`...), để job dọn file mồ côi (docs/modules/core-files.md §5)
không xoá nhầm logo đang dùng. Đổi lại, response `GET`/`PATCH` phải **join thêm `url`** để frontend
hiển thị ngay (`{ fileId, url } | null`) — khác hẳn body `PATCH` gửi lên (chỉ `fileId` thô). Xem
`backend/src/modules/core/settings/systemSettings.service.ts#resolveDisplayValue`.

**`registration_enabled` khác `login_method_settings` ở đâu?** `login_method_settings` khoá riêng
từng KÊNH ĐĂNG NHẬP (kể cả cho user đã có tài khoản — tắt `email_password` thì user cũ cũng không
đăng nhập được bằng mật khẩu nữa). `registration_enabled` là công tắc TỔNG cho việc TẠO TÀI KHOẢN
MỚI — user đã tồn tại không bị ảnh hưởng dù cờ này tắt.

**Chưa làm — `maintenance_mode`**: cố ý **không** thêm trong lần này. Phải có middleware chặn toàn
site + đường thoát cho `super_admin` (không có sẽ tự khoá mình ra ngoài, đúng loại lỗi chốt chặn ở §1
đang phòng ngừa) — độ phức tạp/rủi ro cao hơn hẳn phần còn lại, cần thiết kế riêng.

---

## 5. Kiểm thử system_settings

`backend/tests/unit/modules/systemSettings.service.test.ts` (13 test) — `list()` giải mã đúng JSON
từng kiểu, `getValue()` trả `undefined` khi key chưa seed (không throw), validate sai kiểu theo từng
key → 422, `site_logo` hợp lệ đánh dấu `file_usages` + trả kèm `url`, `site_logo` trỏ file không tồn
tại → 404, `site_logo = null` gỡ `file_usages`, audit log kèm before/after đã giải mã.

`backend/tests/integration/systemSettings.routes.test.ts` (6 test) — 401/403/422 qua HTTP thật.

`backend/tests/unit/modules/auth.service.test.ts` — 3 test riêng cho `registration_enabled`: chặn
`register()`, chặn tài khoản Google MỚI, KHÔNG chặn tài khoản Google đã tồn tại liên kết lần đầu.

**Đã kiểm chứng thật**: chạy migration + seed thật, gọi API thật qua `curl` (PATCH đổi `site_name`,
bật/tắt `registration_enabled` rồi thử `POST /auth/register` thật — xác nhận đúng `403
REGISTRATION_DISABLED`), và Playwright mở `/superadmin/settings` thật trong trình duyệt — sửa tên
website, bật/tắt cờ đăng ký, toast xác nhận đúng.

---

## 6. Phát hiện thêm khi làm (chưa sửa — theo dõi riêng)

**`BE-20` · `verifyMagicLink()` có nhánh "tự tạo tài khoản" KHÔNG BAO GIỜ chạy tới** — comment tại
`auth.service.ts` nói "magic link đóng luôn vai trò đăng ký nhanh" (khớp mô tả ở
[docs/06 §4](../06-api-reference.md)), nhưng `requestMagicLink()` chỉ tạo token (và gửi email) khi
email **đã có tài khoản** — email chưa từng đăng ký sẽ không nhận được link nào cả, nên
`verifyMagicLink()` không bao giờ nhận được 1 token có `userId = null`/email lạ để chạm tới nhánh tự
tạo tài khoản đó. Có 2 hướng sửa: (a) bỏ điều kiện `user &&` ở `requestMagicLink()` để email lạ cũng
nhận được link (đúng như tài liệu mô tả — nhưng cần cân nhắc lại có đổi hành vi chống dò tài khoản
không, vì hiện tại **luôn** trả 200 bất kể email tồn tại hay không, nên về mặt response KHÔNG đổi gì,
chỉ đổi việc email lạ có nhận được mail hay không), hoặc (b) xoá nhánh chết + sửa lại comment/tài liệu
cho khớp thực tế (magic link chỉ dùng để đăng nhập, không đăng ký). **Chưa quyết định hướng nào** —
cần người có thẩm quyền sản phẩm chọn, không tự ý đổi hành vi đăng ký khi đang làm việc khác
(`assertRegistrationEnabled()` đã được thêm sẵn vào nhánh chết đó, phòng khi được nối lại).
**Ước lượng khảo sát thêm + sửa**: ~1 giờ.

---

## 7. Việc còn lại

| Việc | Ưu tiên | Ghi chú |
|---|:---:|---|
| `maintenance_mode` | 🟡 | Cần middleware chặn toàn site + lối thoát cho `super_admin` — thiết kế riêng, xem §4 |
| Storefront đọc `site_name`/`site_logo`/`timezone` | 🟢 | Hiện 2 key này chỉ lưu được qua UI, chưa nơi nào hiển thị ra ngoài |
| Gộp `login_method_settings` vào `system_settings` | 🟢 | Cân nhắc khi có ≥ 2 lý do thật cần, tránh tách/gộp bảng chỉ vì "cho gọn" — xem docs/02 §1 nguyên tắc chống over-engineering |
| `BE-20` — nhánh tự tạo tài khoản chết trong `verifyMagicLink()` | 🟡 | Xem §6 — cần quyết định sản phẩm trước khi sửa |

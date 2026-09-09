# Module: Settings 🔧 Core

Bật/tắt từng phương thức đăng nhập. Đây là **hạt nhân** của module System Settings tổng quát dự kiến
ở Phase 4.

| | |
|---|---|
| **Loại** | 🔧 Core |
| **Backend** | `modules/core/settings/` |
| **Frontend** | `features/core/admin-login-methods/` · `app/(dashboard)/superadmin/login-methods/` |
| **Bảng DB** | `login_method_settings` |
| **Endpoint** | `/api/v1/superadmin/login-methods` (cần `settings.manage` 🔒) |

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

## 4. Phase 4 — mở rộng thành `system_settings`

Bảng key-value tổng quát, `modules/core/settings/` đảm nhiệm cả hai:

```
site_name · site_logo · timezone · maintenance_mode · registration_enabled
login_email_enabled · login_google_enabled · login_magic_link_enabled
```

**Lưu ý khi thiết kế**: `maintenance_mode` phải có đường thoát cho `super_admin` — nếu không, bật chế
độ bảo trì là tự khoá mình ra ngoài, đúng loại lỗi mà chốt chặn ở §1 đang phòng ngừa.

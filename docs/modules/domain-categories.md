# Module: Categories 🌸 Domain

Danh mục sản phẩm dạng **cây** (danh mục cha–con). Đây là module domain **đầu tiên** được triển khai,
và là **mẫu tham chiếu** cho các module domain tiếp theo (products, orders...).

| | |
|---|---|
| **Loại** | 🌸 Domain — viết mới cho từng dự án |
| **Backend** | `modules/domain/categories/` |
| **Frontend** | `features/domain/categories/` · `app/(dashboard)/admin/categories/` |
| **Bảng DB** | `categories` |
| **Endpoint** | `GET /api/v1/categories` (công khai) · `/api/v1/admin/categories` (cần `categories.manage`) |

---

## 1. Vì sao đáng đọc kỹ module này

Module này minh hoạ **đủ mọi quy ước** mà module domain cần tuân theo:

```mermaid
flowchart LR
    subgraph M["modules/domain/categories/"]
        R1["categories.routes.ts<br/>🌐 CÔNG KHAI<br/>chỉ GET /"]
        R2["categories.admin.routes.ts<br/>🔒 authorize('categories.manage')<br/>CRUD đầy đủ"]
        C["categories.controller.ts<br/>DÙNG CHUNG"]
        S["categories.service.ts<br/>DÙNG CHUNG"]
        V["categories.validation.ts"]
    end

    R1 --> C
    R2 --> C
    C --> S
    S --> CORE1["🔧 shared/utils/slugify"]
    S --> CORE2["🔧 modules/core/files<br/>setEntityFile()"]
    S --> CORE3["🔧 modules/core/audit-log<br/>record()"]

    style R1 fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style R2 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style CORE1 fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style CORE2 fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style CORE3 fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

| Quy ước được minh hoạ | Chi tiết |
|---|---|
| **Tách route công khai và route quản trị** | Hai file `*.routes.ts`, **dùng chung** controller/service |
| **Domain dùng lại core** — không ngược lại | `slugify`, `files`, `audit-log` đều là core; chiều ngược lại bị cấm |
| **Hai hàm đọc dữ liệu khác nhau** | `listPublic()` không lộ trường nội bộ; `list()` cho admin trả đủ |
| **Không repository** | Truy vấn đơn giản → gọi Prisma thẳng trong service, đúng [03 §1](../03-backend.md) |
| **Audit log cho mọi thao tác ghi** | create/update/delete đều ghi |

---

## 2. Cây danh mục & chống vòng lặp

```mermaid
flowchart TD
    subgraph OK["✅ Cây hợp lệ"]
        A1["Hoa theo dịp"] --> B1["Sinh nhật"]
        A1 --> B2["Khai trương"]
        A1 --> B3["Chia buồn"]
        A2["Hoa theo kiểu"] --> C1["Bó hoa"]
        A2 --> C2["Lẵng hoa"]
    end

    subgraph BAD["🚫 Vòng lặp — bị chặn"]
        D1["Hoa cưới"] --> D2["Hoa cầm tay"]
        D2 --> D3["Hoa cài áo"]
        D3 -.->|"đặt làm cha của D1<br/>→ 400 CATEGORY_CYCLE"| D1
    end

    style OK fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style BAD fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
```

`assertNoCycle()` đi ngược lên cây từ danh mục cha được đề xuất:

```mermaid
flowchart TD
    S["assertNoCycle(categoryId, proposedParentId)"] --> C1{"categoryId === proposedParentId?"}
    C1 -->|Có| E1["🚫 400 — không thể là cha của chính nó"]
    C1 -->|Không| W["current = proposedParent"]
    W --> L{"current.parentId tồn tại?"}
    L -->|Không| OK["✅ Không có vòng lặp"]
    L -->|Có| C2{"current.parentId === categoryId?"}
    C2 -->|Có| E2["🚫 400 CATEGORY_CYCLE<br/>chọn con làm cha"]
    C2 -->|Không| C3{"Đã thăm parentId này rồi?"}
    C3 -->|Có| OK2["✅ Thoát an toàn<br/>(dữ liệu lỡ có vòng lặp sẵn —<br/>KHÔNG loop vô hạn)"]
    C3 -->|Không| N["visited.add() · đi lên một bậc"]
    N --> L

    style E1 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style E2 fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style OK2 fill:#fef3c7,stroke:#b45309,stroke-width:2px,color:#78350f
```

> Nhánh `visited` (thoát an toàn khi dữ liệu đã có vòng lặp sẵn) là chi tiết dễ bỏ sót: nếu dữ liệu
> trong DB bị sửa tay tạo ra vòng lặp, vòng `while` sẽ chạy vô hạn và treo request. Có test riêng cho
> trường hợp này.

---

## 3. Slug

```mermaid
flowchart TD
    IN["Tên: 'Hoa Sinh Nhật'"] --> Q{"Người dùng có<br/>nhập slug không?"}
    Q -->|Không| GEN["slugify(name)"]
    Q -->|Có| GEN2["slugify(slug người dùng nhập)"]
    GEN --> N["NFD normalize<br/>bỏ dấu tổ hợp U+0300–U+036F<br/>đ → d · Đ → D<br/>ký tự lạ → '-'"]
    GEN2 --> N
    N --> S1["'hoa-sinh-nhat'"]
    S1 --> U{"Đã tồn tại?"}
    U -->|Có| U2["thêm hậu tố: -2, -3, ...<br/>tới khi trống"]
    U -->|Không| DONE(["✅ hoa-sinh-nhat"])
    U2 --> U

    style DONE fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**Quy tắc quan trọng: đổi `name` KHÔNG tự đổi `slug`.**

Slug nằm trong URL công khai (`/danh-muc/hoa-sinh-nhat`). Nếu tự đổi theo tên, mọi link đã chia sẻ
lên Facebook/Zalo và mọi kết quả đã được Google lập chỉ mục đều gãy. Slug chỉ đổi khi người dùng
**chủ động** sửa trường slug.

`slugify` dùng **mã số Unicode** (`0x0300`, `0x0111`) thay vì gõ thẳng ký tự có dấu vào source —
tránh rủi ro hỏng encoding khi file đi qua các công cụ trung gian.

---

## 4. Hai hàm đọc dữ liệu

| | `listPublic()` — storefront | `list()` — admin |
|---|---|---|
| Endpoint | `GET /api/v1/categories` | `GET /api/v1/admin/categories` |
| Quyền | Công khai | `categories.manage` |
| Lọc | Chỉ `isActive = true` | Mặc định `isActive = true`; `?includeInactive=true` lấy tất cả |
| Trường trả về | `id, name, slug, description, parentId, imageFile.url` | Đầy đủ + `sortOrder`, `isActive`, timestamps, `_count.children` |

> **Không dùng chung một hàm cho cả hai.** API công khai không nên lộ `sortOrder` (thông tin sắp xếp
> nội bộ) hay timestamps. Đây là mẫu nên lặp lại ở mọi module domain có mặt công khai.

---

## 5. Ràng buộc nghiệp vụ

| Ràng buộc | Mã lỗi | Vì sao |
|---|---|---|
| Không xoá danh mục còn con | `409 CATEGORY_HAS_CHILDREN` | Tránh danh mục con mồ côi, mất khỏi cây |
| Không tạo vòng lặp cha–con | `400 CATEGORY_CYCLE` | Duyệt cây sẽ loop vô hạn |
| Danh mục cha phải tồn tại | `404 PARENT_NOT_FOUND` | |
| Slug là duy nhất | Tự thêm hậu tố | Slug nằm trong URL |
| Ảnh phải tồn tại và chưa xoá | `404 FILE_NOT_FOUND` | Từ `files.setEntityFile()` |

---

## 6. Frontend

| File | Vai trò |
|---|---|
| `features/domain/categories/categories.service.ts` | Gọi `/api/v1/admin/categories` |
| `features/domain/categories/categories.hooks.ts` | `useCategories`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` |
| `app/(dashboard)/admin/categories/page.tsx` | Danh sách + form tạo/sửa |

`queryKey` dùng `['admin','categories', params]`; sau mutation invalidate theo **prefix**
`['admin','categories']` để bắt hết mọi biến thể tham số lọc.

---

## 7. Kiểm thử

| Tầng | File | Số test |
|---|---|---|
| Unit | `backend/tests/unit/modules/categories.service.test.ts` | 19 — slug, vòng lặp, ràng buộc xoá, không lộ trường nội bộ |
| Integration | `backend/tests/integration/categories.routes.test.ts` | 8 — envelope 201, mã lỗi, validate UUID |
| E2E | `frontend/e2e/categories.spec.ts` | 5 — CRUD qua UI, slug bỏ dấu, ràng buộc, API công khai |

---

## 8. Dùng module này làm mẫu cho module domain tiếp theo

Khi viết `products`, `orders`... hãy sao chép các quyết định sau:

- [ ] Tách `*.routes.ts` (công khai) và `*.admin.routes.ts` (quản trị), dùng chung controller/service
- [ ] Hai hàm đọc dữ liệu riêng cho public và admin — **không** lộ trường nội bộ ra API công khai
- [ ] Slug (nếu có) tự sinh, xử lý trùng, **không tự đổi khi đổi tên**
- [ ] Ảnh đi qua `filesService.setEntityFile()` với `entityType` riêng
- [ ] Mọi thao tác ghi đều `auditLog.record()`
- [ ] Ràng buộc quan hệ (không xoá khi còn tham chiếu) trả **409**, không phải 400
- [ ] Permission thêm vào `domain.seed.ts` và gán cho **cả `admin` lẫn `super_admin`**
- [ ] **Mới với `orders`**: thêm *row-level check* — xem [12 §5.1](../12-danh-gia-va-de-xuat.md)

---

## 9. Việc còn lại

| Việc | Ưu tiên |
|---|:---:|
| Kéo–thả sắp xếp thứ tự (`sortOrder`) trên UI | 🟢 |
| Hiển thị dạng cây trên UI admin (hiện là danh sách phẳng) | 🟢 |
| Trang storefront theo danh mục (`/danh-muc/[slug]`) | 🟡 — cần module `products` trước |
| Bảng `occasions` (dịp lễ) — tag chéo với danh mục | 🟡 |

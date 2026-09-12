# Module: Products 🌸 Domain

Sản phẩm hoa: tên, giá, danh mục, và một **thư viện nhiều ảnh** (khác `categories` chỉ có 1 ảnh đại
diện). **Không có tồn kho** — hoa tươi làm theo đơn/theo mẫu tại thời điểm đặt, không phải hàng lưu
kho theo SKU cố định; ẩn tạm sản phẩm dùng `isActive`, không phải "hết hàng". Là module domain
**thứ hai**, sao chép hầu hết quy ước từ [`categories`](domain-categories.md) — đọc file đó trước
nếu chưa quen mẫu chung.

| | |
|---|---|
| **Loại** | 🌸 Domain — viết mới cho từng dự án |
| **Backend** | `modules/domain/products/` |
| **Frontend** | `features/domain/products/` · `app/(dashboard)/admin/products/` |
| **Bảng DB** | `products` · `product_images` · `product_variants` |
| **Endpoint** | `GET /api/v1/products` (công khai) · `/api/v1/admin/products` (cần `products.manage`) — xem [06 · API §8](../06-api-reference.md#8-products-) |

---

## 1. Khác biệt so với `categories` (module mẫu)

| | `categories` | `products` |
|---|---|---|
| Ảnh | 1 ảnh đại diện (`imageFileId` trên chính bảng) | **Nhiều ảnh** — bảng riêng `product_images` |
| Xoá | **Hard delete**, chặn nếu còn danh mục con | **Soft delete** (`deletedAt`) — `order_items` sẽ tham chiếu sau này |
| Cấu trúc | Cây tự tham chiếu (`parentId`) | Phẳng, chỉ 1 FK tới `categories` (không tự tham chiếu) |
| Permission | 1 permission gộp (`categories.manage`) | 1 permission gộp (`products.manage`) — **giống nhau**, khác bản thiết kế đầu ở [05 §2.3](../05-database-va-rbac.md#23-danh-sách-permission-đề-xuất) từng định tách 4 permission `view/create/update/delete` |
| Giá | — | `basePrice` (Int, VND) ngay trên sản phẩm, **không có tồn kho**; có thể thêm `product_variants` (size/giá riêng) — xem §2.5 và [05 §3.4](../05-database-va-rbac.md#34-nhóm-sản-phẩm) |

---

## 2. Thư viện nhiều ảnh — `product_images` + `file_usages`

```mermaid
flowchart LR
    P["products"] --> PI["product_images<br/>product_id · file_id · sort_order"]
    PI --> F["files (Cloudinary)"]
    P -.->|"syncEntityFiles()<br/>entityType: product_image"| FU["file_usages"]

    style FU fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

`imageFileIds` trong request là **TOÀN BỘ** bộ ảnh mong muốn, đúng thứ tự — không phải "thêm vào":

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant S as products.service
    participant DB as PostgreSQL
    participant FS as filesService

    C->>S: create/update { imageFileIds: [a, b, c] }
    S->>DB: DELETE product_images WHERE product_id = :id
    S->>DB: INSERT product_images (id=a, sortOrder=0), (b, 1), (c, 2)
    S->>FS: syncEntityFiles({ fileIds: [a,b,c], entityType: "product_image", entityId })
    FS->>DB: DELETE file_usages WHERE entityType/entityId khớp
    FS->>DB: INSERT file_usages cho từng fileId mới
    Note over DB: Ảnh bị loại khỏi danh sách mới HẾT được đánh dấu<br/>"đang dùng" ngay — job dọn mồ côi nhận diện đúng
```

- `imageFileIds` **không truyền** (undefined) ở `PATCH` → không đụng gì tới bộ ảnh hiện có.
- `imageFileIds: []` (mảng rỗng) → xoá hết ảnh khỏi sản phẩm.
- `filesService.syncEntityFiles()` là hàm **mới thêm** khi làm module này (không có sẵn từ
  `categories`, vốn chỉ cần `setEntityFile()` cho 1 ảnh) — xem
  [modules/core-files.md](core-files.md).

---

## 2.5. Biến thể (size/giá riêng) — `product_variants`

Một sản phẩm có thể có nhiều **mốc giá theo size** (vd Nhỏ/Vừa/Lớn) thay vì 1 `basePrice` cố định.
Mảng `variants` rỗng (mặc định) = sản phẩm không có biến thể, dùng thẳng `basePrice` như trước —
tính năng này **cộng thêm**, không thay thế cách cũ. Giống triết lý `products`/`product_images`:
**KHÔNG có tồn kho theo variant** — 1 biến thể chỉ là 1 mốc giá, không phải 1 SKU riêng.

```mermaid
flowchart LR
    P["products"] --> PV["product_variants<br/>id · product_id · name · price · sort_order"]
    OI["order_items"] -.->|"variant_id (nullable)<br/>onDelete: SetNull"| PV
    OI --> VN["variant_name<br/>(snapshot lúc đặt)"]

    style PV fill:#fce7f3,stroke:#be185d,stroke-width:2px,color:#831843
    style VN fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
```

`variants` trong request `create`/`update` là **TOÀN BỘ** danh sách mong muốn, giống ngữ nghĩa
`imageFileIds` — nhưng khác cách đồng bộ: ảnh xoá hết rồi tạo lại (ảnh không bị tham chiếu ở đâu
khác), còn biến thể phải **giữ nguyên `id`** khi vẫn còn bị sửa, vì `order_items.variant_id` của các
đơn cũ trỏ tới `id` đó — xoá-tạo-lại sẽ đổi `id` và vỡ liên kết lịch sử.

`replaceVariants()` (`products.service.ts`) diff theo `id`:

```mermaid
flowchart TD
    A(["variants gửi lên"]) --> B{"Có id?"}
    B -->|"Có, khớp variant hiện tại của SẢN PHẨM NÀY"| C["UPDATE giữ nguyên id"]
    B -->|"Không có id, hoặc id lạ<br/>(sản phẩm khác/không tồn tại)"| D["CREATE — id lạ bị bỏ qua,<br/>coi như tạo mới"]
    E(["variant hiện có trong DB<br/>nhưng KHÔNG có trong danh sách gửi lên"]) --> F["DELETE"]

    style C fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
    style D fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#1e3a8a
    style F fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
```

Client gửi `id` không thuộc sản phẩm đang sửa (vd đoán/copy `id` của biến thể sản phẩm khác) được xử
lý AN TOÀN như "tạo mới" (bỏ qua `id` lạ) — không cập nhật nhầm hay báo lỗi, tránh vừa là lỗ hổng vừa
là trải nghiệm khó hiểu. `variants: []` (mảng rỗng, khác `undefined`) xoá hết biến thể — sản phẩm quay
lại dùng thẳng `basePrice`.

**Đơn hàng dùng biến thể** (`orders.service.ts#create`): khi `orderItems[].variantId` có giá trị,
service kiểm tra biến thể đó **thật sự thuộc** `productId` gửi kèm (chống kiểu IDOR — gửi `variantId`
rẻ của sản phẩm khác kèm `productId` đắt để mua giá rẻ) → sai thì `409 PRODUCT_UNAVAILABLE`, cùng mã
lỗi dùng cho các trường hợp sản phẩm không khả dụng khác. Giá dòng đơn lấy từ `variant.price` thay vì
`product.basePrice`, và `variant_name` được **snapshot** vào `order_items` (giống `product_name`) để
đơn cũ vẫn hiển thị đúng dù biến thể sau này đổi tên/bị xoá. Gộp dòng trùng trong 1 đơn theo khoá kép
`(productId, variantId)` — cùng sản phẩm nhưng khác biến thể là 2 dòng riêng (giá khác nhau).

---

## 3. Soft delete — khác `categories`

```mermaid
flowchart TD
    D(["DELETE /admin/products/:id"]) --> F{"Còn tồn tại,<br/>chưa xoá?"}
    F -->|Không| E["404 NOT_FOUND"]
    F -->|Có| U["UPDATE deletedAt = now(), isActive = false"]
    U --> OK(["200 — bản ghi VẪN CÒN trong DB"])

    style E fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style OK fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

`categories.remove()` xoá cứng (`prisma.category.delete`) vì không gì tham chiếu danh mục sau khi xoá.
`products.remove()` **không** xoá cứng — khi module `orders` triển khai, `order_items` sẽ giữ
`product_id` trỏ tới sản phẩm đã ngừng bán, đơn hàng cũ vẫn cần hiển thị đúng tên/giá tại thời điểm
đặt. Mọi truy vấn `list`/`listPublic` đều lọc `deletedAt: null`.

Ảnh của sản phẩm đã soft-delete **không** bị gỡ khỏi `file_usages` — vẫn tính "đang dùng" chừng nào
bản ghi sản phẩm còn tồn tại (dù đã xoá mềm), tránh job dọn mồ côi xoá nhầm ảnh của sản phẩm cũ.

---

## 4. Hai hàm đọc dữ liệu (giống mẫu `categories`)

| | `listPublic()` — storefront | `list()` — admin |
|---|---|---|
| Endpoint | `GET /api/v1/products` | `GET /api/v1/admin/products` |
| Quyền | Công khai | `products.manage` |
| Lọc | `deletedAt: null` + `isActive: true` | Mặc định `isActive: true`; `?includeInactive=true` bỏ lọc `isActive` — `deletedAt: null` LUÔN áp dụng dù `includeInactive` |
| Phân trang | Có (`page`/`limit`, mặc định 24, tối đa 100) — khác `categories` (không phân trang, danh sách nhỏ) | Có |
| Trường trả về | `id, name, slug, description, basePrice, category, images` | Đầy đủ + `categoryId`, `isActive`, `createdAt`, `updatedAt` — hai select riêng (`PRODUCT_PUBLIC_SELECT` vs `PRODUCT_SELECT`), giống cách `categories` tách `CATEGORY_SELECT` |

`getPublicBySlug(slug)` — `GET /api/v1/products/:slug`, dùng cho trang chi tiết. Cùng bộ lọc
(`deletedAt: null` + `isActive: true`) và cùng `PRODUCT_PUBLIC_SELECT` với `listPublic()`, nhưng là
endpoint RIÊNG chứ không lọc trên kết quả `listPublic()` như `categories` đang làm với
`getStorefrontCategoryBySlug()` — vì danh sách sản phẩm có phân trang, không thể tải hết để tìm 1
slug. `404 NOT_FOUND` khi không khớp slug (gộp chung 2 trường hợp "không tồn tại" và "đã ẩn/xoá",
không phân biệt để tránh dò xem sản phẩm nào từng tồn tại).

---

## 5. Ràng buộc nghiệp vụ

| Ràng buộc | Mã lỗi | Vì sao |
|---|---|---|
| Danh mục (`categoryId`) phải tồn tại nếu có truyền | `404 CATEGORY_NOT_FOUND` | Giống `PARENT_NOT_FOUND` ở categories |
| Sản phẩm phải tồn tại và chưa xoá mềm | `404 NOT_FOUND` | Áp dụng cho cả `update` lẫn `remove` |
| Slug là duy nhất (trong các sản phẩm CHƯA xoá) | Tự thêm hậu tố `-2`, `-3`... | Sản phẩm đã xoá mềm không chặn slug mới trùng |
| `variantId` gửi khi đặt hàng phải thuộc đúng `productId` | `409 PRODUCT_UNAVAILABLE` | Xem §2.5 — chống chọn giá biến thể của sản phẩm khác |
| Mọi `occasionId` trong `occasionIds` phải tồn tại | `404 OCCASION_NOT_FOUND` | Xem [domain-occasions.md](domain-occasions.md) — validate TRƯỚC khi xoá tag cũ, không làm mất tag đang có nếu request sai |

---

## 6. Frontend

| File | Vai trò |
|---|---|
| `features/domain/products/products.service.ts` | Gọi `/api/v1/admin/products` |
| `features/domain/products/products.hooks.ts` | `useProducts`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct` |
| `app/(dashboard)/admin/products/page.tsx` | Danh sách + form tạo/sửa, upload nhiều ảnh (`input[multiple]`, loop `useUploadFile` từng file), sửa danh sách biến thể (thêm/đổi tên+giá/xoá dòng — gửi lại TOÀN BỘ `variants` khi lưu, xem §2.5), chọn NHIỀU dịp lễ bằng nút dạng pill — gửi lại TOÀN BỘ `occasionIds` khi lưu, xem [domain-occasions.md](domain-occasions.md) |
| `lib/currency.ts` | `formatVnd()` — `Intl.NumberFormat('vi-VN')`, dùng chung cho mọi nơi hiển thị giá |
| `lib/storefront-api.ts` → `getStorefrontProductBySlug()` | Gọi `GET /api/v1/products/:slug` bằng `fetch` gốc (không phải axios — xem comment đầu file) |
| `app/(storefront)/san-pham/[slug]/page.tsx` | Trang chi tiết — breadcrumb, gallery, mô tả (render `dangerouslySetInnerHTML`, an toàn vì đã sanitize ở backend lúc lưu — xem §9), CTA gọi/Zalo, sản phẩm liên quan (cùng `categoryId`, loại trừ chính nó) |
| `components/storefront/ProductGallery.tsx` | Client Component — đổi ảnh chính khi bấm thumbnail (`useState`), dữ liệu ảnh do trang cha (Server Component) fetch sẵn |
| `components/storefront/AddToCartControls.tsx` | Client Component — chọn biến thể (nút dạng pill) + số lượng + giá hiển thị động theo biến thể đang chọn; không có biến thể thì chỉ hiện `basePrice` tĩnh |
| `components/storefront/ProductCard.tsx` | Sản phẩm CÓ biến thể → bấm "thêm vào giỏ" điều hướng sang trang chi tiết thay vì tự thêm (chưa biết chọn size nào), giá hiển thị "Từ {basePrice}" |
| `store/useCartStore.ts` | 1 dòng giỏ hàng = cặp `(productId, variantId)` — cùng sản phẩm khác biến thể là 2 dòng riêng, khớp cách gộp dòng ở `orders.service.ts` (xem §2.5) |
| `lib/contact-info.ts` | `HOTLINE`/`ZALO_LINK` dùng chung giữa `ProductCard` (overlay hover) và trang chi tiết (CTA chính) — giá trị mẫu, xem TODO trong file |

`ProductForm`/`ImageGallery` là component **tách riêng ở module-scope** (không định nghĩa lồng trong
`ProductsPage`) — định nghĩa component bên trong component khác khiến React tạo lại nó (và mất state)
mỗi lần render cha, bị `eslint-plugin-react-hooks` (`react-hooks/static-components`) chặn từ bản mới.

---

## 7. Kiểm thử

| Tầng | File | Số test |
|---|---|---|
| Unit | `backend/tests/unit/modules/products.service.test.ts` | 38 — slug, soft delete, đồng bộ bộ ảnh, đồng bộ biến thể (`replaceVariants`: giữ `id` khi sửa, tạo mới, xoá dòng vắng mặt, id lạ coi như tạo mới), đồng bộ dịp lễ (`replaceOccasions`: gắn/thay thế toàn bộ, 404 khi occasionId lạ), lọc `occasionId`, ràng buộc danh mục, sanitize mô tả HTML, `getPublicBySlug` |
| Unit | `backend/tests/unit/shared/sanitizeHtml.test.ts` | 5 — giữ thẻ trong allowlist, xoá `<script>`, xoá mọi attribute, hạ cấp thẻ lạ |
| Integration | `backend/tests/integration/products.routes.test.ts` + phần chung trong `rbac.test.ts` | 11 + phần chung — envelope 201, mã lỗi, 403 thiếu quyền, `GET /:slug` công khai + 404 |

Kiểm chứng thủ công qua trình duyệt thật (Playwright, không phải test tự động lưu trong repo): đăng
nhập super_admin → tạo sản phẩm kèm 2 ảnh → sửa giá + gỡ 1 ảnh → xoá — toàn bộ chạy đúng trên
Cloudinary + Postgres thật, không có lỗi console.

Riêng luồng biến thể (11/09/2026), kiểm chứng thủ công thêm qua trình duyệt thật: tạo sản phẩm 2 biến
thể (Nhỏ/Lớn, giá khác nhau) ở `/admin/products` → sang trang chi tiết storefront, chọn "Lớn", giá
hiển thị đổi đúng theo biến thể → thêm vào giỏ, giỏ hàng hiện đúng tên size + giá → đặt hàng, trang
xác nhận đơn hiện đúng "(Lớn)" và giá biến thể (không phải `basePrice`) → quay lại `/admin/products`,
sửa: xoá biến thể "Lớn", đổi giá "Nhỏ", thêm biến thể "Vừa" mới → mở lại form xác nhận đã lưu đúng.
Không có lỗi console/network ngoài các lỗi 401 (kiểm tra phiên đăng nhập lúc tải trang, có chủ đích)
và cảnh báo Google OAuth origin (do chưa cấu hình client ID cho localhost, không liên quan tính năng).

---

## 8. Việc còn lại

| Việc | Ưu tiên | Mã |
|---|:---:|---|
| Tìm kiếm/lọc theo giá | 🟢 | — |
| Kéo–thả sắp xếp `sortOrder` cho ảnh trên UI (hiện chỉ theo thứ tự upload) | 🟢 | — |
| Tách permission `products.view` riêng cho `sales_staff` xem (không sửa) | 🟢 | Xem [12 §BE-10](../12-danh-gia-va-de-xuat.md) |

---

## 9. Mô tả dạng rich text

`description` là **HTML**, không phải văn bản thuần — soạn qua rich text editor
(`components/ui/RichTextEditor.tsx`, dựng trên [TipTap](https://tiptap.dev)) thay vì ô nhập 1 dòng,
để viết được đoạn mô tả có định dạng (thành phần hoa, kích thước, dịp phù hợp...) dài hơn 1 câu.

```mermaid
flowchart LR
    E["RichTextEditor<br/>(TipTap, trình duyệt)"] -->|"editor.getHTML()"| REQ["POST/PATCH<br/>{ description: HTML }"]
    REQ --> S["products.service.ts"]
    S --> SAN["sanitizeDescriptionHtml()<br/>shared/utils/sanitizeHtml.ts"]
    SAN --> DB[("products.description<br/>(đã sạch)")]

    style SAN fill:#fee2e2,stroke:#b91c1c,stroke-width:2px,color:#7f1d1d
    style DB fill:#dcfce7,stroke:#15803d,stroke-width:2px,color:#14532d
```

**Chặn XSS lưu trữ (stored XSS) bằng allowlist, sanitize lúc GHI chứ không phải lúc HIỂN THỊ** — xem
[07 · Bảo mật §3](../07-bao-mat.md#3-bảo-mật-tầng-api-express). `ALLOWED_TAGS` trong
`sanitizeHtml.ts` cố tình khớp **đúng** bộ nút trên toolbar (`p, br, strong, em, ul, ol, li, h2, h3,
blockquote`) — không cho phép **bất kỳ** attribute nào, kể cả `href`, vì mô tả sản phẩm không cần
link. Frontend cũng tắt các extension TipTap không nằm trong allowlist (code, codeBlock, strike,
horizontalRule) để người dùng không định dạng xong rồi bị âm thầm xoá mất lúc lưu — nhưng đây chỉ là
UX, **ranh giới bảo mật thật sự là sanitize ở backend**, không tin riêng việc frontend giới hạn nút gì.

Danh sách sản phẩm (`app/(dashboard)/admin/products/page.tsx`) hiển thị **văn bản thuần rút gọn**
(`lib/html.ts#stripHtml` — bỏ mọi thẻ bằng regex) cho dòng preview ngắn, không render HTML đầy đủ ở
đó; định dạng đầy đủ chỉ hiện lại khi mở form sửa (nạp ngược vào `RichTextEditor`).

> Module nào sau này cũng cho người dùng nhập rich text (vd blog) nên theo đúng mẫu này: sanitize
> bằng allowlist ở backend lúc ghi, không dựa vào sanitize phía client hay sanitize lúc hiển thị.

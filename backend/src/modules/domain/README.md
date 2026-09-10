# 🌸 Domain modules

Module nghiệp vụ đặc thù của dự án (`categories/`, `products/`, `orders/`, `cart/`...).

Khi copy source base sang dự án PERN khác: **xoá toàn bộ thư mục này** và viết domain mới —
xem [docs/02 §2](../../../../docs/02-kien-truc-tong-quan.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

Mỗi module theo cùng convention với `modules/core/*`:
`*.routes.ts → *.controller.ts → *.service.ts → *.validation.ts`, mount router trong
`src/routes/v1/index.ts`. Checklist đầy đủ: [docs/03 §10](../../../../docs/03-backend.md#10-checklist-tạo-module-backend-mới).

> **Quy tắc không được vi phạm**: `modules/core/` KHÔNG được import từ thư mục này.
> Chiều ngược lại (domain dùng core) là hợp lệ và mong muốn.

`categories/` là **mẫu tham chiếu** — xem
[docs/modules/domain-categories.md](../../../../docs/modules/domain-categories.md).

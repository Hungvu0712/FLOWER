# 🌸 Domain features

Hook/service theo nghiệp vụ đặc thù của dự án (`categories/`, `products/`, `cart/`, `orders/`...).

Khi copy source base sang dự án PERN khác: **xoá toàn bộ thư mục này** và viết domain mới —
xem [docs/02 §2](../../../../docs/02-kien-truc-tong-quan.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

Cùng convention với `features/core/*` — mỗi feature đúng 2 file:

- `*.service.ts` — axios thuần, **không import React** (dùng lại được ngoài component)
- `*.hooks.ts` — TanStack Query, kèm invalidate + toast

Component **không tự gọi axios**, luôn đi qua hook. Chi tiết:
[docs/04 §1](../../../../docs/04-frontend.md).

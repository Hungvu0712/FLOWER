# Domain features

Đặt hook/service theo domain nghiệp vụ ở đây (`products/`, `cart/`, `orders/`, `promotions/`, `blog/`...).
Khi copy source base sang dự án khác, xoá toàn bộ nội dung thư mục này và viết domain mới — xem
[ARCHITECTURE.md §2](../../../../ARCHITECTURE.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

Theo cùng convention với `features/core/*`: `*.service.ts` (axios thuần) + `*.hooks.ts` (custom hook
bọc TanStack Query) — component chỉ gọi hook, không tự gọi axios.

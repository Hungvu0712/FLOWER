# Domain modules

Đặt các module nghiệp vụ đặc thù của dự án ở đây (`products/`, `orders/`, `categories/`, `cart/`...).
Khi copy source base sang dự án khác, xoá toàn bộ nội dung thư mục này và viết domain mới — xem
[ARCHITECTURE.md §2](../../../../ARCHITECTURE.md#2-chiến-lược-tái-sử-dụng--core-vs-domain).

Mỗi module theo cùng convention MVC như `modules/core/*`, mount router trong `src/routes/v1/index.ts`.

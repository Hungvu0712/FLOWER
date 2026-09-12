// Giá trị fallback khi backend tạm không phản hồi được (xem getStorefrontSiteContent ở
// storefront-api.ts) — KHÔNG còn là nguồn dữ liệu chính. Admin sửa hotline/Zalo/địa chỉ/giờ mở
// cửa/banner Hero thật qua /admin/site-content (module domain siteContent), storefront đọc động.
export const DEFAULT_SITE_CONTENT = {
  hotline: '0900 000 000',
  zaloLink: 'https://zalo.me/0900000000',
  address: '123 Đường Hoa, Quận 1, TP. Hồ Chí Minh',
  openHours: '07:00 – 21:00 tất cả các ngày',
  heroBannerUrl: null as string | null,
};

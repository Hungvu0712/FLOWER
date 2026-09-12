import { z } from "zod";

// Nội dung storefront admin tự sửa được (KHÁC system_settings — key-set riêng, permission riêng
// `site_content.manage` cấp cho cả admin lẫn super_admin, không chỉ super_admin như settings.manage).
// Cùng dùng chung bảng system_settings (key-value), chỉ khác namespace key — xem docs/modules/domain-site-content.md.
export const SITE_CONTENT_KEYS = [
  "hero_banner",
  "hotline",
  "zalo_link",
  "address",
  "open_hours",
] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

// hotline/address/open_hours lưu ĐÚNG chuỗi admin nhập (không tách riêng bản "hiển thị" khác bản "gốc")
// — storefront tự suy ra biến thể cần thiết (vd số điện thoại thuần cho href="tel:") lúc render.
export const SITE_CONTENT_VALUE_SCHEMAS = {
  hero_banner: z
    .string()
    .uuid("hero_banner phải là id file hợp lệ (tải lên qua /api/v1/files)")
    .nullable(),
  hotline: z.string().trim().min(8, "Số hotline quá ngắn").max(20),
  zalo_link: z.string().trim().url("zalo_link phải là URL hợp lệ, vd https://zalo.me/090..."),
  address: z.string().trim().min(1, "Vui lòng nhập địa chỉ").max(300),
  open_hours: z.string().trim().min(1, "Vui lòng nhập giờ mở cửa").max(200),
} satisfies Record<SiteContentKey, z.ZodTypeAny>;

export type SiteContentValue<K extends SiteContentKey> = z.infer<
  (typeof SITE_CONTENT_VALUE_SCHEMAS)[K]
>;

export const siteContentKeyParamSchema = z.object({ key: z.enum(SITE_CONTENT_KEYS) });

// Body chỉ kiểm tra CÓ trường `value` — kiểu cụ thể validate lại theo từng key ở service.ts (route
// PATCH dùng chung 1 path cho mọi key, giống systemSettings.validation.ts).
export const updateSiteContentBodySchema = z.object({ value: z.unknown() });

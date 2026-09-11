import { z } from "zod";

// docs/12, Phase 4 — bảng key-value tổng quát. Chỉ liệt kê các key ĐÃ CÓ Ý NGHĨA THẬT trong hệ thống
// (site_name/site_logo/timezone: thuần thông tin, chưa nơi nào đọc lại — chuẩn bị cho khi storefront
// cần; registration_enabled: có enforcement thật ở auth.service.ts). CỐ Ý CHƯA thêm `maintenance_mode`
// — bật cờ đó cần middleware chặn toàn site + lối thoát cho super_admin (nếu chặn luôn cả /auth/login
// thì tự khoá mình ra ngoài, đúng loại lỗi mà docs/modules/core-settings.md §4 đã cảnh báo) — đó là
// 1 tính năng riêng, rủi ro cao hơn nhiều so với phần còn lại của Phase 4 này, chưa làm trong lần này.
export const SETTING_KEYS = ["site_name", "site_logo", "timezone", "registration_enabled"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

// Kiểu dữ liệu THẬT của từng key (không phải input HTTP thô) — validate lại ở systemSettings.service.ts
// vì route PATCH /:key dùng CHUNG 1 path cho mọi key, validate() tĩnh ở tầng route không biết trước
// :key là gì để chọn đúng schema tương ứng.
export const SETTING_VALUE_SCHEMAS = {
  site_name: z.string().trim().min(1, "Vui lòng nhập tên website").max(100),
  site_logo: z.string().uuid("site_logo phải là id file hợp lệ (tải lên qua /api/v1/files)").nullable(),
  timezone: z.string().trim().min(1).max(50),
  registration_enabled: z.boolean(),
} satisfies Record<SettingKey, z.ZodTypeAny>;

export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTING_VALUE_SCHEMAS)[K]>;

export const settingKeyParamSchema = z.object({ key: z.enum(SETTING_KEYS) });

// Body chỉ kiểm tra CÓ trường `value` — kiểu cụ thể validate lại theo từng key ở service.ts.
export const updateSettingBodySchema = z.object({ value: z.unknown() });

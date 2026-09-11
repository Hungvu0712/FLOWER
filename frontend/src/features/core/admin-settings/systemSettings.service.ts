import { api } from '@/lib/axios';

export type SettingKey = 'site_name' | 'site_logo' | 'timezone' | 'registration_enabled';

// `value` KHÁC NHAU giữa đọc và ghi cho site_logo — GET/PATCH response trả { fileId, url } | null
// (đã join sẵn url để hiển thị), nhưng PATCH request phải GỬI fileId | null (id file vừa upload qua
// useUploadFile). Xem backend/src/modules/core/settings/systemSettings.service.ts#resolveDisplayValue.
export type SystemSetting = { key: SettingKey; value: unknown; updatedAt: string };

export const systemSettingsService = {
  list: () =>
    api.get<{ data: SystemSetting[] }>('/api/v1/superadmin/settings').then((r) => r.data.data),

  update: (key: SettingKey, value: unknown) =>
    api
      .patch<{ data: SystemSetting }>(`/api/v1/superadmin/settings/${key}`, { value })
      .then((r) => r.data.data),
};

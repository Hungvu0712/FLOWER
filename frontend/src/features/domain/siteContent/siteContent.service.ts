import { api } from '@/lib/axios';

export type SiteContentKey = 'hero_banner' | 'hotline' | 'zalo_link' | 'address' | 'open_hours';

// `value` KHÁC NHAU giữa đọc và ghi cho hero_banner — GET/PATCH response trả { fileId, url } | null
// (đã join sẵn url để hiển thị), nhưng PATCH request phải GỬI fileId | null (id file vừa upload qua
// useUploadFile). Xem backend/.../siteContent/siteContent.service.ts#resolveDisplayValue.
export type SiteContent = { key: SiteContentKey; value: unknown; updatedAt: string };

export const siteContentService = {
  // Đọc qua route PUBLIC (không phải /admin/site-content) — dữ liệu này vốn hiển thị công khai trên
  // storefront nên không cần route admin GET riêng, đỡ trùng code (xem siteContent.controller.ts).
  list: () => api.get<{ data: SiteContent[] }>('/api/v1/site-content').then((r) => r.data.data),

  update: (key: SiteContentKey, value: unknown) =>
    api
      .patch<{ data: SiteContent }>(`/api/v1/admin/site-content/${key}`, { value })
      .then((r) => r.data.data),
};

import { api } from '@/lib/axios';

export type NewsletterSubscriber = {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
};

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const newsletterService = {
  // Công khai — form đăng ký ở footer storefront.
  subscribe: (email: string) => api.post('/api/v1/newsletter/subscribe', { email }),
  unsubscribe: (email: string) => api.post('/api/v1/newsletter/unsubscribe', { email }),

  listAdmin: (params?: { isActive?: boolean; page?: number; limit?: number }) =>
    api
      .get<{ data: NewsletterSubscriber[]; meta: PaginationMeta }>('/api/v1/admin/newsletter', {
        params,
      })
      .then((r) => r.data),

  remove: (id: string) => api.delete(`/api/v1/admin/newsletter/${id}`),
};

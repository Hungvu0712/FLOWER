import { api } from '@/lib/axios';

export type ContactMessage = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  isHandled: boolean;
  createdAt: string;
};

export type SubmitContactInput = {
  name: string;
  phone: string;
  email?: string;
  message: string;
};

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const contactService = {
  // Công khai — không qua /admin, ai cũng gửi được (có rate limit ở backend).
  submit: (input: SubmitContactInput) => api.post('/api/v1/contact', input),

  list: (params?: { isHandled?: boolean; page?: number; limit?: number }) =>
    api
      .get<{ data: ContactMessage[]; meta: PaginationMeta }>('/api/v1/admin/contact-messages', { params })
      .then((r) => r.data),

  setHandled: (id: string, isHandled: boolean) =>
    api.patch(`/api/v1/admin/contact-messages/${id}`, { isHandled }),
};

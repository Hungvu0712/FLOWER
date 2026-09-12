import { api } from '@/lib/axios';

export type SpecialDate = {
  id: string;
  label: string;
  date: string;
  remindDaysBefore: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSpecialDateInput = {
  label: string;
  date: string; // 'YYYY-MM-DD' — chỉ tháng-ngày có ý nghĩa, lặp lại hằng năm
  remindDaysBefore?: number;
};
export type UpdateSpecialDateInput = Partial<CreateSpecialDateInput>;

export const specialDatesService = {
  list: () =>
    api.get<{ data: SpecialDate[] }>('/api/v1/account/special-dates').then((r) => r.data.data),

  create: (input: CreateSpecialDateInput) => api.post('/api/v1/account/special-dates', input),

  update: (id: string, input: UpdateSpecialDateInput) =>
    api.patch(`/api/v1/account/special-dates/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/account/special-dates/${id}`),
};

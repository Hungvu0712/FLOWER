import { api } from '@/lib/axios';

export type Occasion = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateOccasionInput = {
  name: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
};
export type UpdateOccasionInput = Partial<CreateOccasionInput>;

export const occasionsService = {
  list: (params?: { includeInactive?: boolean }) =>
    api.get<{ data: Occasion[] }>('/api/v1/admin/occasions', { params }).then((r) => r.data.data),

  create: (input: CreateOccasionInput) => api.post('/api/v1/admin/occasions', input),

  update: (id: string, input: UpdateOccasionInput) =>
    api.patch(`/api/v1/admin/occasions/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/occasions/${id}`),
};

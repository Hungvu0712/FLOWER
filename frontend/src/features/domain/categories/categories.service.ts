import { api } from '@/lib/axios';

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageFileId: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  imageFile: { url: string } | null;
  _count: { children: number };
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  imageFileId?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};
export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export const categoriesService = {
  list: (params?: { includeInactive?: boolean }) =>
    api.get<{ data: Category[] }>('/api/v1/admin/categories', { params }).then((r) => r.data.data),

  create: (input: CreateCategoryInput) => api.post('/api/v1/admin/categories', input),

  update: (id: string, input: UpdateCategoryInput) =>
    api.patch(`/api/v1/admin/categories/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/categories/${id}`),
};

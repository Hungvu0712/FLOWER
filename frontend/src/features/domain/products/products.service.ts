import { api } from '@/lib/axios';

export type ProductImage = {
  id: string;
  sortOrder: number;
  file: { id: string; url: string };
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  categoryId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  images: ProductImage[];
};

export type CreateProductInput = {
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  categoryId?: string | null;
  isActive?: boolean;
  imageFileIds?: string[];
};
export type UpdateProductInput = Partial<CreateProductInput>;

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const productsService = {
  list: (params?: { includeInactive?: boolean; categoryId?: string; page?: number; limit?: number }) =>
    api
      .get<{ data: Product[]; meta: PaginationMeta }>('/api/v1/admin/products', { params })
      .then((r) => r.data),

  create: (input: CreateProductInput) => api.post('/api/v1/admin/products', input),

  update: (id: string, input: UpdateProductInput) => api.patch(`/api/v1/admin/products/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/products/${id}`),
};

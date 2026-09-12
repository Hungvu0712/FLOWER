import { api } from '@/lib/axios';

export type ProductImage = {
  id: string;
  sortOrder: number;
  file: { id: string; url: string };
};

// Mảng rỗng = sản phẩm không có biến thể, dùng thẳng basePrice — xem docs/05 §3.4.
export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
};

// Tag dịp lễ (Sinh nhật, Valentine...) — 1 sản phẩm gắn được NHIỀU dịp lễ (n-n), khác category (1-n).
export type ProductOccasion = { id: string; name: string; slug: string };

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
  variants: ProductVariant[];
  occasions: ProductOccasion[];
};

// `id` chỉ có khi SỬA 1 biến thể đã tồn tại — bỏ trống = tạo mới. Gửi lại TOÀN BỘ danh sách là thay
// thế hoàn toàn bộ biến thể cũ, giống ngữ nghĩa imageFileIds — xem backend products.service.ts.
export type ProductVariantInput = { id?: string; name: string; price: number };

export type CreateProductInput = {
  name: string;
  slug?: string;
  description?: string;
  basePrice: number;
  categoryId?: string | null;
  isActive?: boolean;
  imageFileIds?: string[];
  variants?: ProductVariantInput[];
  occasionIds?: string[];
};
export type UpdateProductInput = Partial<CreateProductInput>;

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const productsService = {
  list: (params?: {
    includeInactive?: boolean;
    categoryId?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<{ data: Product[]; meta: PaginationMeta }>('/api/v1/admin/products', { params })
      .then((r) => r.data),

  create: (input: CreateProductInput) => api.post('/api/v1/admin/products', input),

  update: (id: string, input: UpdateProductInput) =>
    api.patch(`/api/v1/admin/products/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/products/${id}`),
};

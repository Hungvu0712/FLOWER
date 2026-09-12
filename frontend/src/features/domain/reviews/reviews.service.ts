import { api } from '@/lib/axios';

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; fullName: string };
};

export type OwnReview = Review & {
  productId: string;
  isApproved: boolean;
  updatedAt: string;
  product: { id: string; name: string; slug: string };
};

export type CreateReviewInput = { productId: string; rating: number; comment?: string };

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export const reviewsService = {
  // Công khai — CHỈ đánh giá đã duyệt của 1 sản phẩm.
  listByProduct: (productId: string, params?: { page?: number; limit?: number }) =>
    api
      .get<{ data: Review[]; meta: PaginationMeta }>('/api/v1/reviews', {
        params: { productId, ...params },
      })
      .then((r) => r.data),

  create: (input: CreateReviewInput) => api.post('/api/v1/account/reviews', input),

  listOwn: (params?: { page?: number; limit?: number }) =>
    api
      .get<{ data: OwnReview[]; meta: PaginationMeta }>('/api/v1/account/reviews', { params })
      .then((r) => r.data),

  // Admin — hàng đợi duyệt.
  listAdmin: (params?: {
    isApproved?: boolean;
    productId?: string;
    page?: number;
    limit?: number;
  }) =>
    api
      .get<{ data: OwnReview[]; meta: PaginationMeta }>('/api/v1/admin/reviews', { params })
      .then((r) => r.data),

  moderate: (id: string, isApproved: boolean) =>
    api.patch(`/api/v1/admin/reviews/${id}`, { isApproved }),

  remove: (id: string) => api.delete(`/api/v1/admin/reviews/${id}`),
};

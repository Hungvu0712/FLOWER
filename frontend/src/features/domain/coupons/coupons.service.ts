import { api } from '@/lib/axios';

export type CouponType = 'percent' | 'fixed';

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderValue: number | null;
  startDate: string | null;
  endDate: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCouponInput = {
  code: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  isActive?: boolean;
};
export type UpdateCouponInput = Partial<CreateCouponInput>;

export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export type CouponValidateResult = {
  code: string;
  type: CouponType;
  value: number;
  discountAmount: number;
};

export const couponsService = {
  // Công khai — khách xem trước số tiền được giảm ở /thanh-toan TRƯỚC khi đặt hàng thật.
  validate: (code: string, subtotal: number) =>
    api
      .post<{ data: CouponValidateResult }>('/api/v1/coupons/validate', { code, subtotal })
      .then((r) => r.data.data),

  listAdmin: (params?: { includeInactive?: boolean; page?: number; limit?: number }) =>
    api
      .get<{ data: Coupon[]; meta: PaginationMeta }>('/api/v1/admin/coupons', { params })
      .then((r) => r.data),

  create: (input: CreateCouponInput) => api.post('/api/v1/admin/coupons', input),

  update: (id: string, input: UpdateCouponInput) => api.patch(`/api/v1/admin/coupons/${id}`, input),

  remove: (id: string) => api.delete(`/api/v1/admin/coupons/${id}`),
};

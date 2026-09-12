'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { couponsService, type UpdateCouponInput } from './coupons.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useCoupons(params?: { includeInactive?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'coupons', params ?? null],
    queryFn: () => couponsService.listAdmin(params),
  });
}

function useInvalidateCoupons() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
}

export function useCreateCoupon() {
  const invalidate = useInvalidateCoupons();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: couponsService.create,
    onSuccess: () => {
      invalidate();
      push('Đã tạo mã giảm giá');
    },
    onError: (error) => push(getErrorMessage(error, 'Không tạo được mã giảm giá'), 'error'),
  });
}

export function useUpdateCoupon() {
  const invalidate = useInvalidateCoupons();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCouponInput }) =>
      couponsService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteCoupon() {
  const invalidate = useInvalidateCoupons();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: couponsService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá mã giảm giá');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được mã giảm giá'), 'error'),
  });
}

// Dùng ở /thanh-toan — KHÔNG dùng useQuery (không tự fetch, chỉ chạy khi khách bấm "Áp dụng"), lỗi tự
// xử lý ở nơi gọi (hiện message ngay dưới ô nhập, không dùng toast chung như các mutation quản trị trên).
export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      couponsService.validate(code, subtotal),
  });
}

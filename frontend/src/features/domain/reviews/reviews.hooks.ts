'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewsService } from './reviews.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['reviews', 'product', productId],
    queryFn: () => reviewsService.listByProduct(productId),
  });
}

// `enabled` — chỉ cần kiểm tra "user này đã đánh giá sản phẩm này chưa" khi ĐÃ đăng nhập, giống
// useWishlist(!!me) — tránh gọi API thừa cho khách vãng lai.
export function useOwnReviews(enabled = true) {
  return useQuery({
    queryKey: ['account', 'reviews'],
    queryFn: () => reviewsService.listOwn({ limit: 50 }),
    enabled,
  });
}

export function useCreateReview(productId: string) {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: reviewsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'product', productId] });
      queryClient.invalidateQueries({ queryKey: ['account', 'reviews'] });
      push('Đã gửi đánh giá — chờ quản trị viên duyệt trước khi hiện công khai');
    },
    onError: (error) => push(getErrorMessage(error, 'Không gửi được đánh giá'), 'error'),
  });
}

export function useAdminReviews(params?: {
  isApproved?: boolean;
  productId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'reviews', params ?? null],
    queryFn: () => reviewsService.listAdmin(params),
  });
}

function useInvalidateAdminReviews() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
}

export function useModerateReview() {
  const invalidate = useInvalidateAdminReviews();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      reviewsService.moderate(id, isApproved),
    onSuccess: () => {
      invalidate();
      push('Đã cập nhật đánh giá');
    },
    onError: (error) => push(getErrorMessage(error, 'Không cập nhật được đánh giá'), 'error'),
  });
}

export function useDeleteReview() {
  const invalidate = useInvalidateAdminReviews();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: reviewsService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá đánh giá');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được đánh giá'), 'error'),
  });
}

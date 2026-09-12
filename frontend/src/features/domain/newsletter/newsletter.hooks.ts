'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newsletterService } from './newsletter.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// Dùng ở footer storefront — lỗi/thành công tự xử lý ở nơi gọi (không dùng toast chung), giống
// cách useValidateCoupon() ở coupons.hooks.ts làm cho form áp mã ở /thanh-toan.
export function useSubscribeNewsletter() {
  return useMutation({ mutationFn: newsletterService.subscribe });
}

export function useNewsletterSubscribers(params?: {
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['admin', 'newsletter', params ?? null],
    queryFn: () => newsletterService.listAdmin(params),
  });
}

export function useDeleteNewsletterSubscriber() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: newsletterService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter'] });
      push('Đã xoá người đăng ký');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được'), 'error'),
  });
}

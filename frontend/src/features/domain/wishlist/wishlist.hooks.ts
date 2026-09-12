'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from './wishlist.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// `enabled` — trang/component gọi hook này thường xuất hiện ở storefront công khai (ProductCard,
// trang chi tiết sản phẩm), nơi phần lớn khách vãng lai CHƯA đăng nhập. Truyền `enabled: !!me` để
// tránh gọi API thừa (401) cho mọi khách chưa đăng nhập — giống addresses.hooks.ts#useAddresses.
export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: ['account', 'wishlist'],
    queryFn: wishlistService.list,
    enabled,
  });
}

function useInvalidateWishlist() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['account', 'wishlist'] });
}

export function useAddToWishlist() {
  const invalidate = useInvalidateWishlist();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: wishlistService.add,
    onSuccess: () => {
      invalidate();
      push('Đã thêm vào yêu thích');
    },
    onError: (error) => push(getErrorMessage(error, 'Không thêm được vào yêu thích'), 'error'),
  });
}

export function useRemoveFromWishlist() {
  const invalidate = useInvalidateWishlist();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: wishlistService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã gỡ khỏi yêu thích');
    },
    onError: (error) => push(getErrorMessage(error, 'Không gỡ được khỏi yêu thích'), 'error'),
  });
}

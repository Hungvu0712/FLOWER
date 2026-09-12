'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressesService, type UpdateAddressInput } from './addresses.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// `enabled` mặc định true cho trang /account/addresses (luôn đã đăng nhập, route được gate sẵn). Trang
// thanh-toán (storefront công khai, khách vãng lai KHÔNG đăng nhập vẫn vào được) truyền enabled: false
// khi chưa biết chắc đã đăng nhập — tránh gọi API thừa rồi nhận 401 cho mọi khách vãng lai.
export function useAddresses(enabled = true) {
  return useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: addressesService.list,
    enabled,
  });
}

function useInvalidateAddresses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] });
}

export function useCreateAddress() {
  const invalidate = useInvalidateAddresses();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: addressesService.create,
    onSuccess: () => {
      invalidate();
      push('Đã lưu địa chỉ');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được địa chỉ'), 'error'),
  });
}

export function useUpdateAddress() {
  const invalidate = useInvalidateAddresses();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAddressInput }) =>
      addressesService.update(id, input),
    onSuccess: () => {
      invalidate();
      push('Đã lưu thay đổi');
    },
    onError: (error) => push(getErrorMessage(error, 'Không lưu được thay đổi'), 'error'),
  });
}

export function useDeleteAddress() {
  const invalidate = useInvalidateAddresses();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: addressesService.remove,
    onSuccess: () => {
      invalidate();
      push('Đã xoá địa chỉ');
    },
    onError: (error) => push(getErrorMessage(error, 'Không xoá được địa chỉ'), 'error'),
  });
}

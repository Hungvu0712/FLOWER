'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ordersService, type OrderStatus } from './orders.service';
import { useToastStore } from '@/store/useToastStore';
import { getErrorMessage } from '@/lib/errors';

// Không toast lỗi chung chung ở đây — trang checkout tự hiện lỗi validate theo từng field (giống
// useSubmitContact ở features/core/contact/contact.hooks.ts), thành công thì điều hướng sang trang
// xác nhận thay vì chỉ hiện toast.
export function useCreateOrder() {
  return useMutation({ mutationFn: ordersService.create });
}

export function useOrders(params?: { status?: OrderStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'orders', params ?? null],
    queryFn: () => ordersService.listAdmin(params),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      push('Đã cập nhật trạng thái đơn');
    },
    onError: (error) => push(getErrorMessage(error, 'Không cập nhật được trạng thái'), 'error'),
  });
}

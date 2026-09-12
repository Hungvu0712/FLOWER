'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import type { OrderStatus } from './orders.service';

type OrderStatusChangedPayload = { id: string; status: OrderStatus };

// Trang xác nhận đơn công khai (/don-hang/[id]) — join room theo ĐÚNG id đơn (UUID đóng vai trò
// token, giống cách backend orders.routes.ts cho tra cứu công khai qua id, xem
// docs/modules/domain-orders.md). KHÔNG cần đăng nhập — biết đúng id coi như có quyền xem đơn đó.
export function useLiveOrderStatus(orderId: string, initialStatus: OrderStatus): OrderStatus {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('order:watch', orderId);

    function onStatusChanged(payload: OrderStatusChangedPayload) {
      if (payload.id === orderId) setStatus(payload.status);
    }
    socket.on('order:status_changed', onStatusChanged);
    return () => {
      socket.off('order:status_changed', onStatusChanged);
    };
  }, [orderId]);

  return status;
}

// Dashboard quản trị (/admin/orders, /admin/orders/delivery-queue) — chỉ cần biết "có gì mới" để tự
// invalidate cache React Query rồi refetch, không tự merge dữ liệu realtime ở client (tránh lệch với
// filter/phân trang hiện tại của từng trang). Backend chỉ cho join room này nếu xác thực được cookie
// + đủ quyền orders.view_all/orders.view_delivery_queue (xem orders.realtime.ts) — nếu không đủ
// quyền, "admin:watch" âm thầm không có tác dụng gì (không lỗi, không toast) vì trang này vốn đã bị
// AdminShell chặn truy cập từ trước khi tới được đây.
export function useAdminOrdersRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    socket.emit('admin:watch');

    function onChange() {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'delivery-queue'] });
    }
    socket.on('order:created', onChange);
    socket.on('order:status_changed', onChange);
    return () => {
      socket.off('order:created', onChange);
      socket.off('order:status_changed', onChange);
    };
  }, [queryClient]);
}

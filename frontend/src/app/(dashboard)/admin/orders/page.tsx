'use client';

import { useState } from 'react';
import { useOrders, useUpdateOrderStatus } from '@/features/domain/orders/orders.hooks';
import { ORDER_STATUS_LABELS, ORDER_TIME_SLOT_LABELS, type OrderStatus } from '@/features/domain/orders/orders.service';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { formatVnd } from '@/lib/currency';
import { formatDeliveryDate } from '@/lib/date';
import { IconReceipt } from '@/components/admin/icons';

const STATUS_TONE: Record<OrderStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'neutral',
  preparing: 'neutral',
  delivering: 'neutral',
  completed: 'success',
  cancelled: 'danger',
};

const FILTERS: { label: string; value: OrderStatus | undefined }[] = [
  { label: 'Tất cả', value: undefined },
  { label: ORDER_STATUS_LABELS.pending, value: 'pending' },
  { label: ORDER_STATUS_LABELS.confirmed, value: 'confirmed' },
  { label: ORDER_STATUS_LABELS.preparing, value: 'preparing' },
  { label: ORDER_STATUS_LABELS.delivering, value: 'delivering' },
  { label: ORDER_STATUS_LABELS.completed, value: 'completed' },
  { label: ORDER_STATUS_LABELS.cancelled, value: 'cancelled' },
];

// Trạng thái kế tiếp GỢI Ý cho mỗi trạng thái hiện tại — chỉ để hiện nút bấm nhanh 1 chạm cho luồng
// thường gặp. KHÔNG phải state machine đầy đủ: backend (orders.service.ts) mới là nơi validate thật
// (permission theo giá trị status, chặn đổi khi đơn đã ở trạng thái cuối...) — xem docs/05 §2.4.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'completed',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useOrders({ status: filter, limit: 50 });
  const updateStatus = useUpdateOrderStatus();

  const orders = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Đơn hàng" description="Đơn khách đặt qua storefront — xác nhận và cập nhật trạng thái." />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.value
                ? 'border-rose bg-rose-light text-rose-dark'
                : 'border-border text-ink-soft hover:border-rose hover:text-rose'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <IconReceipt className="h-8 w-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">Chưa có đơn hàng nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            const next = NEXT_STATUS[order.status];
            const isFinal = order.status === 'completed' || order.status === 'cancelled';

            return (
              <div key={order.id} className="rounded-3xl border border-border-soft bg-white p-6">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{order.orderCode}</p>
                      <StatusBadge tone={STATUS_TONE[order.status]}>{ORDER_STATUS_LABELS[order.status]}</StatusBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {order.recipientName} · {order.recipientPhone} · {formatDateTime(order.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Giao {formatDeliveryDate(order.deliveryDate)} — {ORDER_TIME_SLOT_LABELS[order.deliveryTimeSlot]}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose">{formatVnd(order.total)}</span>
                </button>

                {expanded && (
                  <div className="mt-4 border-t border-border-soft pt-4">
                    <p className="text-xs text-ink-muted">Địa chỉ giao: {order.deliveryAddress}</p>
                    {order.note && <p className="mt-1 text-xs text-ink-muted">Ghi chú: {order.note}</p>}

                    <div className="mt-3 flex flex-col gap-1.5">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-ink-soft">
                            {item.productName} × {item.quantity}
                          </span>
                          <span className="text-ink">{formatVnd(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {!isFinal && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {next && (
                          <Button
                            size="sm"
                            loading={updateStatus.isPending}
                            onClick={() => updateStatus.mutate({ id: order.id, status: next })}
                          >
                            Chuyển sang &quot;{ORDER_STATUS_LABELS[next]}&quot;
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          loading={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                        >
                          Huỷ đơn
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

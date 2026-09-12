'use client';

import { useState } from 'react';
import { useDeliveryQueue, useUpdateOrderStatus } from '@/features/domain/orders/orders.hooks';
import { useAdminOrdersRealtime } from '@/features/domain/orders/orders.realtime.hooks';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIME_SLOT_LABELS,
  type OrderStatus,
  type OrderTimeSlot,
} from '@/features/domain/orders/orders.service';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { formatVnd } from '@/lib/currency';
import { IconReceipt } from '@/components/admin/icons';

const STATUS_TONE: Record<OrderStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'neutral',
  preparing: 'neutral',
  delivering: 'neutral',
  completed: 'success',
  cancelled: 'danger',
};

// Trạng thái kế tiếp GỢI Ý — chỉ để hiện nút bấm nhanh, KHÔNG phải state machine đầy đủ (giống hệt
// admin/orders/page.tsx, xem docs/modules/domain-orders.md §7). Trùng lặp CÓ CHỦ Ý — 2 trang độc lập,
// tách thành hằng số dùng chung chưa đáng công sức cho 6 dòng ánh xạ đơn giản này.
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'completed',
};

const TIME_SLOT_ORDER: OrderTimeSlot[] = ['sang', 'chieu', 'toi'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Dashboard RIÊNG cho florist (docs/05: florist chỉ có orders.view_delivery_queue, KHÔNG có
// orders.view_all nên KHÔNG vào được /admin/orders bình thường) — permission kiểm tra thật ở backend
// (GET /admin/orders/delivery-queue), route/sidebar chỉ là UX (xem components/admin/AdminShell.tsx
// cho phép role florist vào riêng route này). Xem docs/modules/domain-orders.md §9.
export default function DeliveryQueuePage() {
  const [date, setDate] = useState(todayIso());
  const { data: orders, isLoading } = useDeliveryQueue(date);
  const updateStatus = useUpdateOrderStatus();
  useAdminOrdersRealtime(); // đơn mới/đổi trạng thái từ nơi khác (vd sales_staff) tự cập nhật danh sách

  const bySlot = TIME_SLOT_ORDER.map((slot) => ({
    slot,
    orders: (orders ?? []).filter((o) => o.deliveryTimeSlot === slot),
  }));

  return (
    <div>
      <PageHeader
        title="Lịch giao hoa"
        description="Đơn cần chuẩn bị/giao theo ngày — dùng cho nhân viên cắm hoa."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDate(d, -1))}>
          ← Hôm trước
        </Button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose"
        />
        <Button variant="outline" size="sm" onClick={() => setDate((d) => shiftDate(d, 1))}>
          Hôm sau →
        </Button>
        {date !== todayIso() && (
          <Button variant="outline" size="sm" onClick={() => setDate(todayIso())}>
            Về hôm nay
          </Button>
        )}
        <span className="text-sm font-medium capitalize text-ink-muted">
          {formatDisplayDate(date)}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : (orders ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <IconReceipt className="h-8 w-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">Không có đơn nào cần giao ngày này.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {bySlot.map(
            ({ slot, orders: slotOrders }) =>
              slotOrders.length > 0 && (
                <div key={slot}>
                  <h2 className="mb-3 text-sm font-semibold text-ink">
                    {ORDER_TIME_SLOT_LABELS[slot]} · {slotOrders.length} đơn
                  </h2>
                  <div className="flex flex-col gap-3">
                    {slotOrders.map((order) => {
                      const next = NEXT_STATUS[order.status];
                      const isFinal = order.status === 'completed' || order.status === 'cancelled';
                      return (
                        <div
                          key={order.id}
                          className="rounded-3xl border border-border-soft bg-white p-6"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-ink">{order.orderCode}</p>
                                <StatusBadge tone={STATUS_TONE[order.status]}>
                                  {ORDER_STATUS_LABELS[order.status]}
                                </StatusBadge>
                              </div>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                {order.recipientName} · {order.recipientPhone}
                              </p>
                              <p className="mt-0.5 text-xs text-ink-muted">
                                Địa chỉ: {order.deliveryAddress}
                              </p>
                              {order.note && (
                                <p className="mt-0.5 text-xs text-ink-muted">
                                  Ghi chú: {order.note}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-rose">
                              {formatVnd(order.total)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-col gap-1.5 border-t border-border-soft pt-3">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-ink-soft">
                                  {item.productName}
                                  {item.variantName && ` (${item.variantName})`} × {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>

                          {!isFinal && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {next && (
                                <Button
                                  size="sm"
                                  loading={updateStatus.isPending}
                                  onClick={() =>
                                    updateStatus.mutate({ id: order.id, status: next })
                                  }
                                >
                                  Chuyển sang &quot;{ORDER_STATUS_LABELS[next]}&quot;
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

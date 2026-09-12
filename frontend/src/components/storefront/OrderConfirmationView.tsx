'use client';

import Link from 'next/link';
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps';
import { useLiveOrderStatus } from '@/features/domain/orders/orders.realtime.hooks';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIME_SLOT_LABELS,
  type Order,
} from '@/features/domain/orders/orders.service';
import { formatVnd } from '@/lib/currency';
import { DEFAULT_STOREFRONT_SITE_CONTENT, type StorefrontSiteContent } from '@/lib/storefront-api';
import { formatDeliveryDate } from '@/lib/date';

// Client Component — order.status là phần DUY NHẤT có thể đổi SAU khi trang đã tải (admin/florist/
// shipper đổi trạng thái ở dashboard khi khách vẫn đang mở trang này) nên cần realtime qua
// useLiveOrderStatus(); mọi field khác (địa chỉ, sản phẩm, tổng tiền...) là snapshot cố định tại thời
// điểm đặt hàng, không cần theo dõi. page.tsx (Server Component) chỉ fetch `order` 1 lần rồi render
// component này — xem docs/modules/domain-orders.md §10.
export function OrderConfirmationView({
  order,
  siteContent = DEFAULT_STOREFRONT_SITE_CONTENT,
}: {
  order: Order;
  siteContent?: StorefrontSiteContent;
}) {
  const status = useLiveOrderStatus(order.id, order.status);
  const isCancelled = status === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl px-8 py-10 lg:px-16">
      <CheckoutSteps current="confirm" />
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full ${isCancelled ? 'bg-red-100' : 'bg-rose-light'}`}
        >
          {isCancelled ? (
            <svg
              className="h-7 w-7 text-red-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg
              className="h-7 w-7 text-rose"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <polyline points="4 12 9 17 20 6" />
            </svg>
          )}
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {isCancelled ? 'Đơn hàng đã huỷ' : 'Đặt hàng thành công!'}
        </h1>
        {!isCancelled && (
          <p className="max-w-md text-sm text-ink-muted">
            Cảm ơn bạn đã đặt hoa tại Hoa Xinh — cửa hàng sẽ gọi điện xác nhận đơn trong thời gian
            sớm nhất.
          </p>
        )}
      </div>

      <div className="mt-10 rounded-3xl border border-border-soft bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-soft pb-5">
          <div>
            <p className="text-xs text-ink-muted">Mã đơn hàng</p>
            <p className="text-lg font-semibold text-ink">{order.orderCode}</p>
          </div>
          <span className="rounded-full bg-rose-light px-4 py-1.5 text-xs font-semibold text-rose-dark">
            {ORDER_STATUS_LABELS[status]}
          </span>
        </div>

        <div className="mt-5 grid gap-4 border-b border-border-soft pb-5 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink-muted">Người nhận</p>
            <p className="font-medium text-ink">{order.recipientName}</p>
            <p className="text-ink-soft">{order.recipientPhone}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Giao hàng</p>
            <p className="font-medium text-ink">{order.deliveryAddress}</p>
            <p className="text-ink-soft">
              {formatDeliveryDate(order.deliveryDate)} —{' '}
              {ORDER_TIME_SLOT_LABELS[order.deliveryTimeSlot]}
            </p>
          </div>
          {order.note && (
            <div className="sm:col-span-2">
              <p className="text-xs text-ink-muted">Ghi chú</p>
              <p className="text-ink-soft">{order.note}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-soft">
                {item.productName}
                {item.variantName && ` (${item.variantName})`} × {item.quantity}
              </span>
              <span className="font-medium text-ink">{formatVnd(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-1.5 border-t border-border-soft pt-5 text-sm">
          {order.discountAmount > 0 && (
            <>
              <div className="flex items-center justify-between text-ink-soft">
                <span>Tạm tính</span>
                <span>{formatVnd(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-ink-soft">
                <span>
                  Giảm giá
                  {order.couponCode && (
                    <span className="ml-1 font-mono text-xs text-ink-muted">
                      ({order.couponCode})
                    </span>
                  )}
                </span>
                <span>-{formatVnd(order.discountAmount)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-ink">Tổng cộng (thanh toán khi nhận hàng)</span>
            <span className="text-rose">{formatVnd(order.total)}</span>
          </div>
        </div>
      </div>

      {!isCancelled && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-rose-light/60 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-ink-soft">Cần đổi thông tin giao hoặc có câu hỏi về đơn?</p>
          <div className="flex gap-3">
            <a
              href={`tel:${siteContent.hotlineTel}`}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-rose hover:text-white"
            >
              Gọi {siteContent.hotline}
            </a>
            <a
              href={siteContent.zaloLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-rose hover:text-white"
            >
              Nhắn Zalo
            </a>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
          ← Tiếp tục xem thêm hoa
        </Link>
      </div>
    </div>
  );
}

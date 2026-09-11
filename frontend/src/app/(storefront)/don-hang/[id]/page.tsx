import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps';
import { formatVnd } from '@/lib/currency';
import { HOTLINE, HOTLINE_DISPLAY, ZALO_LINK } from '@/lib/contact-info';
import { formatDeliveryDate } from '@/lib/date';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIME_SLOT_LABELS,
} from '@/features/domain/orders/orders.service';
import { getOrderById } from '@/lib/storefront-api';

// Public — `id` (UUID) đóng vai trò token tra cứu, xem ghi chú ở backend orders.routes.ts. Khách bookmark
// hoặc lưu lại link này để xem lại tình trạng đơn bất cứ lúc nào, không cần tài khoản.
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const isCancelled = order.status === 'cancelled';

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
            {ORDER_STATUS_LABELS[order.status]}
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
                {item.productName} × {item.quantity}
              </span>
              <span className="font-medium text-ink">{formatVnd(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border-soft pt-5 text-sm font-semibold">
          <span className="text-ink">Tổng cộng (thanh toán khi nhận hàng)</span>
          <span className="text-rose">{formatVnd(order.total)}</span>
        </div>
      </div>

      {!isCancelled && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-rose-light/60 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-ink-soft">Cần đổi thông tin giao hoặc có câu hỏi về đơn?</p>
          <div className="flex gap-3">
            <a
              href={`tel:${HOTLINE}`}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-rose hover:text-white"
            >
              Gọi {HOTLINE_DISPLAY}
            </a>
            <a
              href={ZALO_LINK}
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

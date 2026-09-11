'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { CheckoutSteps } from '@/components/storefront/CheckoutSteps';
import { formatVnd } from '@/lib/currency';
import { useCartStore, useCartTotal } from '@/store/useCartStore';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const hasHydrated = useCartStore((s) => s.hasHydrated);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = useCartTotal();
  const router = useRouter();

  // Chưa đọc xong localStorage thì chưa vội kết luận "trống" — tránh chớp nhầm trạng thái trống rồi
  // mới hiện lại giỏ hàng thật ngay sau đó (xem ghi chú ở useCartStore.ts).
  if (!hasHydrated) return null;

  if (items.length === 0) {
    return (
      <div className="px-8 py-10 lg:px-16">
        <CheckoutSteps current="cart" />
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <FlowerIcon className="h-12 w-12" color="var(--color-rose)" />
          <h1 className="font-display text-2xl font-semibold text-ink">Giỏ hàng đang trống</h1>
          <p className="max-w-sm text-sm text-ink-muted">
            Chọn vài mẫu hoa yêu thích rồi quay lại đây nhé.
          </p>
          <Link
            href="/"
            className="rounded-full bg-rose px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-dark"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-10 lg:px-16">
      <CheckoutSteps current="cart" />
      <h1 className="mt-8 font-display text-3xl font-semibold text-ink">Giỏ hàng</h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-soft/70 bg-white p-4 shadow-sm"
            >
              <Link href={`/san-pham/${item.slug}`} className="shrink-0">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-rose-light">
                    <FlowerIcon className="h-8 w-8" color="var(--color-rose)" />
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/san-pham/${item.slug}`}
                  className="font-semibold text-ink hover:text-rose"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-sm text-ink-muted">{formatVnd(item.basePrice)}</p>
              </div>

              <div className="flex items-center rounded-full border border-border">
                <button
                  type="button"
                  onClick={() => setQuantity(item.productId, item.quantity - 1)}
                  aria-label={`Giảm số lượng ${item.name}`}
                  className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-rose"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-semibold text-ink">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(item.productId, item.quantity + 1)}
                  aria-label={`Tăng số lượng ${item.name}`}
                  className="flex h-9 w-9 items-center justify-center text-ink-soft hover:text-rose"
                >
                  +
                </button>
              </div>

              <span className="w-28 shrink-0 text-right font-semibold text-rose">
                {formatVnd(item.basePrice * item.quantity)}
              </span>

              <button
                type="button"
                onClick={() => removeItem(item.productId)}
                aria-label={`Xoá ${item.name} khỏi giỏ`}
                className="text-ink-muted transition-colors hover:text-red-600"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 12.1a2 2 0 0 1-2 1.9H9.8a2 2 0 0 1-2-1.9L7 7" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-2xl border border-border-soft/70 bg-white p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Tạm tính</span>
            <span className="font-semibold text-ink">{formatVnd(total)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Phí giao hàng (nếu có) sẽ được cửa hàng xác nhận qua điện thoại sau khi đặt.
          </p>
          <button
            type="button"
            onClick={() => router.push('/thanh-toan')}
            className="mt-6 w-full rounded-full bg-rose py-3 text-sm font-semibold text-white shadow-lg shadow-rose/25 transition-colors hover:bg-rose-dark"
          >
            Tiến hành đặt hàng
          </button>
        </div>
      </div>
    </div>
  );
}

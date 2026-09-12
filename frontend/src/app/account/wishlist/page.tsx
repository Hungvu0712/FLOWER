'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWishlist, useRemoveFromWishlist } from '@/features/domain/wishlist/wishlist.hooks';
import { formatVnd } from '@/lib/currency';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';

export default function WishlistPage() {
  const { data: wishlist, isLoading } = useWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const items = wishlist ?? [];

  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink">Sản phẩm yêu thích</h1>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Đang tải...</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <FlowerIcon className="h-10 w-10" color="var(--color-rose)" />
          <p className="text-sm text-ink-muted">Chưa có sản phẩm yêu thích nào.</p>
          <Link href="/" className="text-sm font-semibold text-rose hover:text-rose-dark">
            ← Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border-soft p-4"
            >
              <Link href={`/san-pham/${item.slug}`} className="shrink-0">
                {item.images[0] ? (
                  <Image
                    src={item.images[0].file.url}
                    alt={item.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-rose-light">
                    <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
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
                <p className="mt-0.5 text-sm text-ink-muted">{formatVnd(item.basePrice)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={removeFromWishlist.isPending}
                onClick={() => removeFromWishlist.mutate(item.id)}
              >
                Gỡ
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

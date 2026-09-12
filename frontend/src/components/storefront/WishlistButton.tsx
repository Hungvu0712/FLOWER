'use client';

import { useRouter } from 'next/navigation';
import { useMe } from '@/features/core/account/account.hooks';
import {
  useWishlist,
  useAddToWishlist,
  useRemoveFromWishlist,
} from '@/features/domain/wishlist/wishlist.hooks';

// Nút tim yêu thích dùng chung cho ProductCard (lưới sản phẩm) và trang chi tiết sản phẩm. Khách CHƯA
// đăng nhập bấm vào → điều hướng sang /login thay vì gọi API (sẽ 401) — giữ trải nghiệm rõ ràng hơn
// là nút không phản ứng gì. `stopPropagation`/`preventDefault` BẮT BUỘC vì ProductCard đặt nút này
// LỒNG trong `<Link>` (ảnh sản phẩm) — thiếu 2 dòng này sẽ vừa toggle yêu thích vừa điều hướng nhầm.
export function WishlistButton({
  productId,
  className = '',
}: {
  productId: string;
  className?: string;
}) {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: wishlist } = useWishlist(!!me);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const isSaved = !!wishlist?.some((item) => item.id === productId);
  const pending = addToWishlist.isPending || removeFromWishlist.isPending;

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!me) {
      router.push('/login');
      return;
    }
    if (isSaved) removeFromWishlist.mutate(productId);
    else addToWishlist.mutate(productId);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={isSaved ? 'Gỡ khỏi yêu thích' : 'Thêm vào yêu thích'}
      aria-pressed={isSaved}
      className={`pointer-events-auto flex items-center justify-center transition-colors disabled:opacity-60 ${isSaved ? 'text-rose' : ''} ${className}`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={isSaved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 21s-7.5-4.6-10-9.2C.5 8.6 2 5 5.5 5c2 0 3.5 1.2 4.5 2.7C11 6.2 12.5 5 14.5 5 18 5 19.5 8.6 18 11.8 15.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}

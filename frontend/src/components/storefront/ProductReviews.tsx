'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/features/core/account/account.hooks';
import {
  useProductReviews,
  useOwnReviews,
  useCreateReview,
} from '@/features/domain/reviews/reviews.hooks';

function Stars({ rating, className = 'h-4 w-4' }: { rating: number; className?: string }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          fill={n <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className={className}
        >
          <path d="M10 1.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z" />
        </svg>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} sao`}
          className="text-amber-400"
        >
          <svg
            viewBox="0 0 20 20"
            fill={n <= value ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6"
          >
            <path d="M10 1.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN');
}

// Client Component RIÊNG (khác trang cha là Server Component) — cần state (form đánh giá) + gọi API
// qua React Query, giống AddToCartControls.tsx. `basePrice`/ảnh không cần ở đây nên không nhận props
// từ cha, tự fetch bằng productId. Xem docs/modules/domain-reviews.md.
export function ProductReviews({ productId }: { productId: string }) {
  const { data: me } = useMe();
  const { data: reviewsData, isLoading } = useProductReviews(productId);
  const { data: ownReviews } = useOwnReviews(!!me);
  const createReview = useCreateReview(productId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  // Khối "đăng nhập để đánh giá / đã đánh giá / form viết đánh giá" đổi HẲN loại thẻ gốc (<p> hay
  // <div>) tuỳ `me` — nhưng `me` đến từ useQuery, luôn `undefined` ở lần render ĐẦU TIÊN phía client
  // (trước khi effect fetch chạy xong), y hệt lúc SSR. Vấn đề là axios ở phía server KHÔNG có cookie
  // của trình duyệt nên có thể tự trả lỗi khác đi — để KHÔNG bao giờ lệch giữa 2 lần render đầu (SSR
  // và client trước khi mount xong), luôn hiện 1 khối placeholder GIỐNG NHAU cho tới khi `mounted`,
  // rồi mới rẽ nhánh theo `me` thật. Bug THẬT đã gặp: F5 trang sản phẩm lúc đã đăng nhập → lỗi
  // "Hydration failed" trong console (React phải render lại toàn bộ khối này ở client).
  // CỐ Ý: đây là mẫu "cờ đã mount" chuẩn để né hydration mismatch (đợi 1 tick sau khi DOM đã khớp SSR
  // mới rẽ nhánh theo state chỉ có ở client), không phải effect đồng bộ dữ liệu thông thường mà rule
  // react-hooks/set-state-in-effect nhắm tới.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []); // eslint-disable-line react-hooks/set-state-in-effect

  const reviews = reviewsData?.data ?? [];
  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const alreadyReviewed = ownReviews?.data.find((r) => r.productId === productId);

  function submit() {
    if (rating === 0) return;
    createReview.mutate(
      { productId, rating, comment: comment.trim() || undefined },
      { onSuccess: () => setComment('') },
    );
  }

  return (
    <section className="mt-16 border-t border-border-soft pt-10">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">Đánh giá</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-ink-muted">
            <Stars rating={Math.round(averageRating)} />
            <span>
              {averageRating.toFixed(1)}/5 ({reviewsData?.meta.total} đánh giá)
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border-soft bg-ivory-50 p-5">
        {!mounted ? (
          <p className="text-sm text-ink-muted">Đang tải...</p>
        ) : !me ? (
          <p className="text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-rose hover:text-rose-dark">
              Đăng nhập
            </Link>{' '}
            để viết đánh giá cho sản phẩm này.
          </p>
        ) : alreadyReviewed ? (
          <div>
            <p className="text-sm font-medium text-ink">Bạn đã đánh giá sản phẩm này</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Stars rating={alreadyReviewed.rating} />
              {!alreadyReviewed.isApproved && (
                <span className="text-xs text-ink-muted">(đang chờ duyệt)</span>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Viết đánh giá của bạn</p>
            <StarPicker value={rating} onChange={setRating} />
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận về sản phẩm (tuỳ chọn)..."
              className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
            />
            <button
              type="button"
              onClick={submit}
              disabled={rating === 0 || createReview.isPending}
              className="mt-3 rounded-full bg-rose px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createReview.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {isLoading ? (
          <p className="text-sm text-ink-muted">Đang tải đánh giá...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có đánh giá nào cho sản phẩm này.</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="border-b border-border-soft pb-5 last:border-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{review.user.fullName}</p>
                <span className="text-xs text-ink-muted">{formatDate(review.createdAt)}</span>
              </div>
              <Stars rating={review.rating} className="mt-1 h-3.5 w-3.5" />
              {review.comment && <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

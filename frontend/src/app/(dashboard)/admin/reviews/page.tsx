'use client';

import { useState } from 'react';
import {
  useAdminReviews,
  useModerateReview,
  useDeleteReview,
} from '@/features/domain/reviews/reviews.hooks';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { IconStar } from '@/components/admin/icons';
import { confirmDialog } from '@/store/useConfirmStore';

type Filter = 'pending' | 'approved' | 'all';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStar key={n} className={`h-3.5 w-3.5 ${n <= rating ? 'fill-current' : 'fill-none'}`} />
      ))}
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

// Hàng đợi duyệt đánh giá — permission `reviews.moderate` (chỉ admin/super_admin, xem
// docs/05 §2.4). Mặc định lọc "Chờ duyệt" — đây là việc CẦN LÀM, khác categories/products list mặc
// định "Tất cả". Xem docs/modules/domain-reviews.md.
export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const { data, isLoading } = useAdminReviews({
    isApproved: filter === 'all' ? undefined : filter === 'approved',
    limit: 50,
  });
  const moderateReview = useModerateReview();
  const deleteReview = useDeleteReview();

  const reviews = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Đánh giá" description="Duyệt/ẩn đánh giá sản phẩm từ khách hàng." />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { label: 'Chờ duyệt', value: 'pending' },
            { label: 'Đã duyệt', value: 'approved' },
            { label: 'Tất cả', value: 'all' },
          ] as const
        ).map((f) => (
          <button
            key={f.value}
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
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
          <IconStar className="h-8 w-8 text-ink-muted" />
          <p className="text-sm text-ink-muted">Không có đánh giá nào.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-3xl border border-border-soft bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{review.user.fullName}</p>
                    <StatusBadge tone={review.isApproved ? 'success' : 'warning'}>
                      {review.isApproved ? 'Đã duyệt' : 'Chờ duyệt'}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Sản phẩm: {review.product.name} · {formatDateTime(review.createdAt)}
                  </p>
                  <Stars rating={review.rating} />
                  {review.comment && <p className="mt-2 text-sm text-ink-soft">{review.comment}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!review.isApproved && (
                    <Button
                      size="sm"
                      loading={moderateReview.isPending}
                      onClick={() => moderateReview.mutate({ id: review.id, isApproved: true })}
                    >
                      Duyệt
                    </Button>
                  )}
                  {review.isApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      loading={moderateReview.isPending}
                      onClick={() => moderateReview.mutate({ id: review.id, isApproved: false })}
                    >
                      Ẩn
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const confirmed = await confirmDialog(
                        `Xoá đánh giá của "${review.user.fullName}"? Hành động này không thể hoàn tác.`,
                        { title: 'Xoá đánh giá', danger: true },
                      );
                      if (confirmed) deleteReview.mutate(review.id);
                    }}
                  >
                    Xoá
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

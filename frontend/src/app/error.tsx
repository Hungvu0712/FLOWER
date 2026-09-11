'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Button } from '@/components/ui/Button';

// Next.js tự bọc mọi route con bằng error boundary này khi component render lỗi — trước đây
// (docs/12 FE-01) KHÔNG có file này, một lỗi render bất ngờ = TRANG TRẮNG, người dùng không biết
// chuyện gì xảy ra và không có đường thoát. `reset()` thử render lại cây component (không phải
// tải lại trang) — hợp cho lỗi tạm thời (vd request mạng lỗi); còn lại vẫn cần bấm "Về trang chủ".
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi render trang:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-4 text-center">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <FlowerIcon className="h-7 w-7" color="var(--color-rose)" />
        <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
      </Link>

      <h1 className="font-display text-2xl font-semibold text-ink">Đã có lỗi xảy ra</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Trang gặp sự cố ngoài dự kiến. Bạn có thể thử lại, hoặc quay về trang chủ.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Link href="/">
          <Button variant="outline">Về trang chủ</Button>
        </Link>
      </div>
    </div>
  );
}

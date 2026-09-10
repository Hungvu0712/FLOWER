'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useVerifyMagicLink } from '@/features/core/auth/auth.hooks';

function VerifyMagicLinkInner() {
  const token = useSearchParams().get('token');
  const verify = useVerifyMagicLink();
  const triggered = useRef(false);

  useEffect(() => {
    if (token && !triggered.current) {
      triggered.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);

  if (!token) return <p className="text-sm text-red-600">Thiếu token trong liên kết.</p>;
  if (verify.isError) {
    return <p className="text-sm text-red-600">Liên kết không hợp lệ hoặc đã hết hạn — vui lòng yêu cầu liên kết mới.</p>;
  }
  return <p className="text-sm text-ink-soft">Đang xác thực đăng nhập...</p>;
}

// MAGIC_LINK_BASE_URL ở backend/.env trỏ về route này — xem docs/02 §2.
export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">Đang tải...</p>}>
      <VerifyMagicLinkInner />
    </Suspense>
  );
}

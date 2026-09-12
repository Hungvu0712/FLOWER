'use client';

import { useState } from 'react';
import { useSubscribeNewsletter } from '@/features/domain/newsletter/newsletter.hooks';
import { getErrorMessage } from '@/lib/errors';

// Form đăng ký nhận email ở footer — lỗi/thành công hiện NGAY dưới form (không dùng toast chung), tự
// đóng ô nhập sau khi đăng ký thành công thay vì để khách bấm nhầm lần 2.
export function NewsletterSignupForm() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const subscribe = useSubscribeNewsletter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    subscribe.mutate(email, {
      onSuccess: () => setDone(true),
      onError: (err) => setError(getErrorMessage(err, 'Đăng ký không thành công, thử lại sau')),
    });
  }

  if (done) {
    return (
      <p className="text-sm font-medium text-rose-dark">
        Cảm ơn bạn đã đăng ký! Hãy đón chờ ưu đãi từ Hoa Xinh.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm sm:w-auto">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email của bạn"
          className="w-full min-w-0 rounded-full border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted/60 focus:border-rose focus:ring-1 focus:ring-rose"
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="shrink-0 rounded-full bg-rose px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-dark disabled:opacity-60"
        >
          Đăng ký
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useMe } from '@/features/core/account/account.hooks';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { UserMenu } from './UserMenu';

// Dùng chung cho cả storefront ((storefront)/layout.tsx) và trang đăng nhập/đăng ký ((auth)/layout.tsx)
// nên đặt ở components/layout thay vì _components riêng của storefront.
export function Nav() {
  const { data: me } = useMe();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-soft bg-ivory/95 px-8 py-6 backdrop-blur lg:px-16">
      <Link href="/" className="flex items-center gap-2.5">
        <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
        <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
      </Link>

      <nav className="hidden gap-9 text-sm font-medium text-ink-soft md:flex">
        <Link href="/" className="hover:text-rose">Trang chủ</Link>
        <Link href="/" className="hover:text-rose">Sản phẩm</Link>
        <Link href="/" className="hover:text-rose">Dịp lễ</Link>
        <Link href="/" className="hover:text-rose">Về chúng tôi</Link>
        <Link href="/" className="hover:text-rose">Liên hệ</Link>
      </nav>

      <div className="flex items-center gap-5">
        <svg className="h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.6" y2="16.6" />
        </svg>
        <svg className="h-5 w-5 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 6h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6" />
          <circle cx="9" cy="21" r="1" />
          <circle cx="18" cy="21" r="1" />
        </svg>
        {me ? (
          <UserMenu me={me} />
        ) : (
          <Link href="/login" className="text-sm font-semibold text-rose hover:text-rose-dark">
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}

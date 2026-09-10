'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/features/core/account/account.hooks';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { UserMenu } from './UserMenu';

type NavCategory = { id: string; name: string; slug: string };

// Dropdown danh mục dưới "Sản phẩm" — bấm mở/đóng + click ra ngoài để đóng, giống hệt UserMenu.tsx
// (không dùng CSS hover: hover-only dropdown không dùng được trên mobile/touch).
function ProductsMenu({ categories }: { categories: NavCategory[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 hover:text-rose"
        aria-expanded={open}
      >
        Sản phẩm
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-56 rounded-2xl border border-border-soft bg-white p-2 shadow-lg">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/danh-muc/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-ivory-50 hover:text-rose"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Dùng chung cho cả storefront ((storefront)/layout.tsx) và trang đăng nhập/đăng ký ((auth)/layout.tsx)
// nên đặt ở components/layout thay vì _components riêng của storefront. `categories` chỉ được layout
// storefront (Server Component) fetch và truyền xuống — layout auth/account không truyền gì, dropdown
// "Sản phẩm" tự rớt về link tĩnh, tránh phải tự gọi API danh mục ở những trang không cần.
export function Nav({ categories = [] }: { categories?: NavCategory[] }) {
  const { data: me } = useMe();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border-soft bg-ivory/95 px-8 py-6 backdrop-blur lg:px-16">
      <Link href="/" className="flex items-center gap-2.5">
        <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
        <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
      </Link>

      <nav className="hidden gap-9 text-sm font-medium text-ink-soft md:flex md:items-center">
        <Link href="/" className="hover:text-rose">Trang chủ</Link>
        {categories.length > 0 ? (
          <ProductsMenu categories={categories} />
        ) : (
          <Link href="/" className="hover:text-rose">Sản phẩm</Link>
        )}
        <Link href="/" className="hover:text-rose">Dịp lễ</Link>
        <Link href="/ve-chung-toi" className="hover:text-rose">Về chúng tôi</Link>
        <Link href="/lien-he" className="hover:text-rose">Liên hệ</Link>
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

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/features/core/account/account.hooks';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { useCartCount } from '@/store/useCartStore';
import { UserMenu } from './UserMenu';

type NavCategory = { id: string; name: string; slug: string };

const NAV_LINKS = [
  { href: '/ve-chung-toi', label: 'Về chúng tôi' },
  { href: '/lien-he', label: 'Liên hệ' },
];

const VALUE_PROPS = [
  'Hoa tươi mỗi ngày',
  'Cắm theo đơn, giao đúng giờ hẹn',
  'Tư vấn nhanh qua Zalo/hotline',
];

// Băng giá trị cốt lõi phía trên header — nơi đầu tiên khách nhìn thấy, đưa thẳng các ý bán hàng
// chính lên (thay vì để khách tự suy ra khi lướt hết trang). Ẩn trên mobile cho gọn (md:flex).
function TopBar() {
  return (
    <div className="hidden items-center justify-center gap-8 bg-ink px-8 py-2 text-[11px] font-medium tracking-wide text-white/80 md:flex lg:px-16">
      {VALUE_PROPS.map((text, i) => (
        <span key={text} className="flex items-center gap-2">
          {i > 0 && <span className="text-white/30">·</span>}
          {text}
        </span>
      ))}
    </div>
  );
}

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
        <div className="absolute left-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-border-soft bg-white p-2 shadow-xl shadow-ink/5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/danh-muc/${cat.slug}`}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm text-ink-soft hover:bg-rose-light hover:text-rose-dark"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Menu trượt từ phải cho mobile/tablet (< md) — trước đây nav KHÔNG có menu mobile: link chỉ
// `hidden md:flex`, dưới md khách không cách nào bấm vào "Danh mục"/"Về chúng tôi"/"Liên hệ" từ
// header. Đây là khoảng trống UX thật, không phải làm mới cho đẹp.
function MobileMenu({
  categories,
  open,
  onClose,
}: {
  categories: NavCategory[];
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  useEffect(() => onClose(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        aria-label="Đóng menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
      />
      <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold text-ink">Menu</span>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-rose-light hover:text-rose"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>

        <nav className="mt-8 flex flex-col gap-1 text-base font-medium text-ink">
          <Link
            href="/"
            onClick={onClose}
            className="rounded-xl px-3 py-3 hover:bg-rose-light hover:text-rose-dark"
          >
            Trang chủ
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="rounded-xl px-3 py-3 hover:bg-rose-light hover:text-rose-dark"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {categories.length > 0 && (
          <div className="mt-6 border-t border-border-soft pt-6">
            <p className="px-3 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              Danh mục hoa
            </p>
            <nav className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/danh-muc/${cat.slug}`}
                  onClick={onClose}
                  className="rounded-xl px-3 py-2.5 hover:bg-rose-light hover:text-rose-dark"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div className="mt-auto border-t border-border-soft pt-6">
          <Link
            href="/gio-hang"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-full bg-rose py-3 text-sm font-semibold text-white hover:bg-rose-dark"
          >
            Xem giỏ hàng
          </Link>
        </div>
      </div>
    </div>
  );
}

// Dùng chung cho cả storefront ((storefront)/layout.tsx) và trang đăng nhập/đăng ký ((auth)/layout.tsx)
// nên đặt ở components/layout thay vì _components riêng của storefront. `categories` chỉ được layout
// storefront (Server Component) fetch và truyền xuống — layout auth/account không truyền gì, dropdown
// "Sản phẩm" tự rớt về link tĩnh, tránh phải tự gọi API danh mục ở những trang không cần.
export function Nav({ categories = [] }: { categories?: NavCategory[] }) {
  const { data: me } = useMe();
  const cartCount = useCartCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40">
      <TopBar />
      <header className="flex items-center justify-between border-b border-border-soft/70 bg-white/85 px-8 py-5 backdrop-blur-md lg:px-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-rose-light hover:text-rose md:hidden"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <line x1="3.5" y1="7" x2="20.5" y2="7" />
              <line x1="3.5" y1="12" x2="20.5" y2="12" />
              <line x1="3.5" y1="17" x2="20.5" y2="17" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
            <span className="font-display text-2xl font-semibold text-ink">Hoa Xinh</span>
          </Link>
        </div>

        <nav className="hidden gap-9 text-sm font-medium text-ink-soft md:flex md:items-center">
          <Link href="/" className="hover:text-rose">
            Trang chủ
          </Link>
          {categories.length > 0 ? (
            <ProductsMenu categories={categories} />
          ) : (
            <Link href="/" className="hover:text-rose">
              Sản phẩm
            </Link>
          )}
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-rose">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 sm:gap-5">
          <svg
            className="hidden h-5 w-5 text-ink-soft sm:block"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.6" y2="16.6" />
          </svg>
          <Link
            href="/gio-hang"
            aria-label="Giỏ hàng"
            className="relative text-ink-soft hover:text-rose"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3 6h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L22 8H6" />
              <circle cx="9" cy="21" r="1" />
              <circle cx="18" cy="21" r="1" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            )}
          </Link>
          {me ? (
            <UserMenu me={me} />
          ) : (
            <Link href="/login" className="text-sm font-semibold text-rose hover:text-rose-dark">
              Đăng nhập
            </Link>
          )}
        </div>
      </header>

      <MobileMenu categories={categories} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from '@/features/core/auth/auth.hooks';
import { Button } from '@/components/ui/Button';

const links = [
  { href: '/account/profile', label: 'Hồ sơ' },
  { href: '/account/devices', label: 'Thiết bị đăng nhập' },
];

// Middleware đã chặn sớm nếu chưa có access_token hợp lệ (xem middleware.ts) — layout này chỉ lo UI,
// backend vẫn là nơi thật sự enforce quyền trên từng API. Xem SECURITY.md §2.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm ${
                pathname === link.href ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => logout.mutate()} loading={logout.isPending}>
          Đăng xuất
        </Button>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

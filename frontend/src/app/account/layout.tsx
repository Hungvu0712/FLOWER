'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLogout } from '@/features/core/auth/auth.hooks';
import { Button } from '@/components/ui/Button';

const links = [
  { href: '/account/profile', label: 'Hồ sơ' },
  { href: '/account/devices', label: 'Thiết bị đăng nhập' },
];

// proxy.ts đã chặn sớm nếu chưa có access_token hợp lệ — layout này chỉ lo UI, backend vẫn là nơi
// thật sự enforce quyền trên từng API. Xem SECURITY.md §2.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href ? 'bg-rose text-white' : 'text-ink-soft hover:bg-rose-light'
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

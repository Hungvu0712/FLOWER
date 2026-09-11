'use client';

import { useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/features/core/account/account.hooks';
import { useLogout } from '@/features/core/auth/auth.hooks';
import { FlowerIcon } from '@/components/ui/FlowerIcon';
import { Avatar } from '@/components/admin/Avatar';
import { IconStore, IconLogout, IconMenu, IconX } from '@/components/admin/icons';

export type ShellNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  soon?: boolean;
};

export type ShellNavSection = {
  title?: string;
  items: ShellNavItem[];
};

type Props = {
  brandSubtitle: string;
  sections: ShellNavSection[];
  footerLine: string;
  children: React.ReactNode;
};

// Khung sidebar/topbar dùng cho khu vực quản trị (/admin, /superadmin) — đặt trong 1 route group
// (dashboard) nên header/nav/footer không bị remount khi chuyển trang giữa các mục (xem
// app/(dashboard)/layout.tsx). Full-bleed (không max-w căn giữa cả khối) để không bị hẹp/lệch tâm
// trên màn hình rộng — từng trang tự quyết định độ rộng nội dung của mình.
// Chỉ dùng bởi AdminShell (components/admin/AdminShell.tsx) — trang tài khoản khách hàng /account
// có diện mạo riêng, xem app/account/layout.tsx. Xem docs/04 §3.
export function DashboardShell({ brandSubtitle, sections, footerLine, children }: Props) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-6 py-6">
        <FlowerIcon className="h-6 w-6" color="var(--color-rose)" />
        <div>
          <p className="font-display text-lg font-semibold leading-tight text-ink">Hoa Xinh</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {brandSubtitle}
          </p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6">
        {sections.map((section, index) => (
          <div key={section.title || index}>
            {section.title && (
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {section.title}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                if (item.soon) {
                  return (
                    <span
                      key={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted/60"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                      <span className="ml-auto rounded-full bg-border-soft px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                        Sắp có
                      </span>
                    </span>
                  );
                }
                const active =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? 'bg-rose text-white' : 'text-ink-soft hover:bg-rose-light'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border-soft px-4 py-4">
        <Link
          href="/account/profile"
          onClick={() => setMobileOpen(false)}
          className="mb-1 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ivory-50"
        >
          <Avatar name={me?.fullName ?? '?'} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{me?.fullName ?? '...'}</p>
            <p className="truncate text-xs text-ink-muted">{footerLine}</p>
          </div>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-ivory-50"
        >
          <IconStore className="h-5 w-5" />
          Về trang chủ
        </Link>
        <button
          onClick={() => logout.mutate()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-ivory-50"
        >
          <IconLogout className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ivory-50">
      <div className="flex items-center justify-between border-b border-border-soft bg-white px-4 py-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <FlowerIcon className="h-5 w-5" color="var(--color-rose)" />
          <span className="font-display text-base font-semibold text-ink">
            Hoa Xinh — {brandSubtitle}
          </span>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="text-ink-soft" aria-label="Mở menu">
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border-soft bg-white md:flex">
          {sidebarContent}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
            <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-6 text-ink-soft"
                aria-label="Đóng menu"
              >
                <IconX className="h-5 w-5" />
              </button>
              {sidebarContent}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 px-6 py-10 md:px-10">{children}</main>
      </div>
    </div>
  );
}

import Link from 'next/link';

// Xem ARCHITECTURE.md §14 — route này chỉ super_admin vào được (chặn ở proxy.ts + backend authorize()).
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-10 px-6 py-12">
      <aside className="w-52 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">SuperAdmin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/superadmin/users" className="rounded-full px-4 py-2 text-ink-soft transition-colors hover:bg-rose-light">
            Người dùng
          </Link>
          <Link href="/superadmin/login-methods" className="rounded-full px-4 py-2 text-ink-soft transition-colors hover:bg-rose-light">
            Phương thức đăng nhập
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

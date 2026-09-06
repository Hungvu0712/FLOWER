import Link from 'next/link';

// Xem ARCHITECTURE.md §8.1 — route này chỉ super_admin vào được (chặn ở middleware.ts + backend authorize()).
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">SuperAdmin</p>
        <nav className="flex flex-col gap-1 text-sm">
          <Link href="/superadmin/users" className="rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            Người dùng
          </Link>
          <Link href="/superadmin/login-methods" className="rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100">
            Phương thức đăng nhập
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

// Khung core cho khu vực quản trị — nội dung menu/route con (products, orders...) thuộc domain,
// viết thêm khi triển khai nghiệp vụ thật. Xem ARCHITECTURE.md §2, §14.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-10 px-6 py-12">
      <aside className="w-48 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Admin</p>
        <nav className="flex flex-col gap-1 text-sm text-ink-muted">
          <span>Sản phẩm (domain — chưa triển khai)</span>
          <span>Đơn hàng (domain — chưa triển khai)</span>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

// Khung core cho khu vực quản trị — nội dung menu/route con (products, orders...) thuộc domain,
// viết thêm khi triển khai nghiệp vụ thật. Xem ARCHITECTURE.md §2.2, §8.1.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl gap-8 px-4 py-8">
      <aside className="w-48 shrink-0">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">Admin</p>
        <nav className="flex flex-col gap-1 text-sm text-neutral-500">
          <span>Sản phẩm (domain — chưa triển khai)</span>
          <span>Đơn hàng (domain — chưa triển khai)</span>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}

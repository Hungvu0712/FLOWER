export default function AdminHomePage() {
  return (
    <div className="rounded-3xl border border-border-soft bg-white p-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Thống kê & module nghiệp vụ (products, orders...) sẽ được thêm ở <code>features/domain</code>.
      </p>
    </div>
  );
}

import { PageHeader } from '@/components/admin/PageHeader';
import { IconPackage, IconReceipt, IconUsers } from '@/components/admin/icons';

const stats = [
  { label: 'Sản phẩm', value: '—', icon: IconPackage },
  { label: 'Đơn hàng', value: '—', icon: IconReceipt },
  { label: 'Khách hàng', value: '—', icon: IconUsers },
];

export default function AdminHomePage() {
  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description="Số liệu vận hành cửa hàng — sẽ hiển thị khi module domain (sản phẩm, đơn hàng) được triển khai."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border-soft bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-light">
              <stat.icon className="h-5 w-5 text-rose" />
            </div>
            <p className="text-2xl font-semibold text-ink">{stat.value}</p>
            <p className="text-sm text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-ink-muted">
          Các module nghiệp vụ (sản phẩm, đơn hàng...) sẽ được thêm vào{' '}
          <code className="rounded bg-ivory-50 px-1.5 py-0.5">features/domain</code>. Xem ARCHITECTURE.md §18.
        </p>
      </div>
    </div>
  );
}

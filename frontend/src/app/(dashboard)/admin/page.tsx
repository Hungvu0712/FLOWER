'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDashboardOverview, useRevenueChart } from '@/features/domain/dashboard/dashboard.hooks';
import { useDeliveryQueue, useOrders } from '@/features/domain/orders/orders.hooks';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIME_SLOT_LABELS,
  type OrderStatus,
} from '@/features/domain/orders/orders.service';
import type { DashboardPeriod } from '@/features/domain/dashboard/dashboard.service';
import { PageHeader } from '@/components/admin/PageHeader';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { formatVnd, formatVndCompact } from '@/lib/currency';
import {
  IconCalendar,
  IconPackage,
  IconReceipt,
  IconStar,
  IconTrendUp,
  IconUsers,
} from '@/components/admin/icons';

const STATUS_TONE: Record<OrderStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  pending: 'warning',
  confirmed: 'neutral',
  preparing: 'neutral',
  delivering: 'neutral',
  completed: 'success',
  cancelled: 'danger',
};

// Cùng 4 tông với StatusBadge.tsx — dùng làm màu chấm tròn ở card "Đơn hàng theo trạng thái", KHÔNG
// tự bịa bảng màu mới.
const TONE_DOT_CLASS: Record<'success' | 'danger' | 'warning' | 'neutral', string> = {
  success: 'bg-sage',
  danger: 'bg-red-600',
  warning: 'bg-amber-500',
  neutral: 'bg-ink-muted',
};

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d': '7 ngày',
  '30d': '30 ngày',
  '3m': '3 tháng',
};
const PERIOD_OPTIONS: DashboardPeriod[] = ['7d', '30d', '3m'];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

function formatChartDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function RevenueChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent === null) {
    return <span className="text-xs font-medium text-ink-muted">Mới so với kỳ trước</span>;
  }
  if (changePercent === 0) {
    return <span className="text-xs font-medium text-ink-muted">Không đổi so với kỳ trước</span>;
  }
  const positive = changePercent > 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-sage' : 'text-red-600'}`}>
      {positive ? '▲' : '▼'} {Math.abs(changePercent)}% so với kỳ trước
    </span>
  );
}

function RevenueTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { date: string; revenue: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]!.payload;
  return (
    <div className="rounded-xl border border-border-soft bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-ink">{formatChartDate(point.date)}</p>
      <p className="mt-0.5 text-rose">{formatVnd(point.revenue)}</p>
    </div>
  );
}

export default function AdminHomePage() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const { data: overview, isLoading: overviewLoading } = useDashboardOverview(period);
  const { data: chartPoints, isLoading: chartLoading } = useRevenueChart(period);
  const { data: recentOrdersData } = useOrders({ limit: 5 });
  const { data: deliveryQueue } = useDeliveryQueue(todayIso());

  const recentOrders = recentOrdersData?.data ?? [];
  const todayDeliveries = deliveryQueue ?? [];

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description="Tình hình kinh doanh cửa hàng — cập nhật theo thời gian thực."
        actions={
          <div className="flex gap-1 rounded-full border border-border-soft bg-white p-1">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  period === p ? 'bg-rose text-white' : 'text-ink-soft hover:text-rose'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        }
      />

      {/* Hàng 1 — 4 thẻ KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-light">
            <IconTrendUp className="h-5 w-5 text-rose" />
          </div>
          <p className="text-2xl font-semibold text-ink">
            {overviewLoading ? '—' : formatVnd(overview?.revenue.current ?? 0)}
          </p>
          <p className="text-sm text-ink-muted">Doanh thu</p>
          {!overviewLoading && overview && (
            <div className="mt-2">
              <RevenueChangeBadge changePercent={overview.revenue.changePercent} />
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-light">
            <IconReceipt className="h-5 w-5 text-rose" />
          </div>
          <p className="text-2xl font-semibold text-ink">
            {overviewLoading ? '—' : overview?.orders.total}
          </p>
          <p className="text-sm text-ink-muted">Đơn hàng</p>
          {!overviewLoading && overview && (
            <p className="mt-2 text-xs font-medium text-amber-600">
              {overview.orders.byStatus.pending} đơn chờ xác nhận
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-light">
            <IconUsers className="h-5 w-5 text-rose" />
          </div>
          <p className="text-2xl font-semibold text-ink">
            {overviewLoading ? '—' : overview?.customers.total}
          </p>
          <p className="text-sm text-ink-muted">Khách hàng</p>
          {!overviewLoading && overview && (
            <p className="mt-2 text-xs font-medium text-ink-muted">
              +{overview.customers.newInPeriod} mới trong kỳ
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-light">
            <IconPackage className="h-5 w-5 text-rose" />
          </div>
          <p className="text-2xl font-semibold text-ink">
            {overviewLoading ? '—' : overview?.products.total}
          </p>
          <p className="text-sm text-ink-muted">Sản phẩm đang bán</p>
        </div>
      </div>

      {/* Hàng 2 — biểu đồ doanh thu + đơn hàng theo trạng thái */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-border-soft bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink">Doanh thu theo ngày</h2>
          {chartLoading || !chartPoints ? (
            <p className="text-sm text-ink-muted">Đang tải...</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartPoints} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-rose)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--color-rose)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatChartDate}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                  axisLine={{ stroke: 'var(--color-border-soft)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatVndCompact}
                  tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-rose)"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Đơn hàng theo trạng thái</h2>
          {overviewLoading || !overview ? (
            <p className="text-sm text-ink-muted">Đang tải...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${TONE_DOT_CLASS[STATUS_TONE[status]]}`}
                    />
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                  <span className="font-medium text-ink">{overview.orders.byStatus[status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hàng 3 — đơn hàng gần đây */}
      <div className="mt-4 rounded-3xl border border-border-soft bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Đơn hàng gần đây</h2>
          <Link href="/admin/orders" className="text-xs font-medium text-rose hover:text-rose-dark">
            Xem tất cả →
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-ink-muted">Chưa có đơn hàng nào.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border-soft">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href="/admin/orders"
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0 hover:bg-ivory-50"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink">{order.orderCode}</p>
                    <StatusBadge tone={STATUS_TONE[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {order.recipientName} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-rose">{formatVnd(order.total)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Hàng 4 — sản phẩm bán chạy + việc cần xử lý */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">🌹 Sản phẩm bán chạy</h2>
          {overviewLoading || !overview ? (
            <p className="text-sm text-ink-muted">Đang tải...</p>
          ) : overview.topProducts.length === 0 ? (
            <p className="text-sm text-ink-muted">Chưa có dữ liệu bán hàng trong kỳ này.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {overview.topProducts.map((p, i) => (
                <div key={p.productName} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-soft">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-light text-[10px] font-semibold text-rose">
                      {i + 1}
                    </span>
                    {p.productName}
                  </span>
                  <span className="font-medium text-ink">{p.quantity} bó</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border-soft bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">⚡ Việc cần xử lý</h2>
          {overviewLoading || !overview ? (
            <p className="text-sm text-ink-muted">Đang tải...</p>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href="/admin/orders"
                className="flex items-center justify-between rounded-2xl bg-ivory-50 px-4 py-3 text-sm hover:bg-rose-light"
              >
                <span className="flex items-center gap-2 text-ink-soft">
                  <IconReceipt className="h-4 w-4" /> Đơn chờ xác nhận
                </span>
                <span className="font-semibold text-ink">{overview.orders.byStatus.pending}</span>
              </Link>
              <Link
                href="/admin/orders/delivery-queue"
                className="flex items-center justify-between rounded-2xl bg-ivory-50 px-4 py-3 text-sm hover:bg-rose-light"
              >
                <span className="flex items-center gap-2 text-ink-soft">
                  <IconCalendar className="h-4 w-4" /> Đơn cần giao hôm nay
                </span>
                <span className="font-semibold text-ink">{todayDeliveries.length}</span>
              </Link>
              <Link
                href="/admin/reviews"
                className="flex items-center justify-between rounded-2xl bg-ivory-50 px-4 py-3 text-sm hover:bg-rose-light"
              >
                <span className="flex items-center gap-2 text-ink-soft">
                  <IconStar className="h-4 w-4" /> Đánh giá chờ duyệt
                </span>
                <span className="font-semibold text-ink">{overview.pendingReviews}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Hàng 5 — lịch giao hoa hôm nay */}
      <div className="mt-4 rounded-3xl border border-border-soft bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">🚚 Lịch giao hoa hôm nay</h2>
          <Link
            href="/admin/orders/delivery-queue"
            className="text-xs font-medium text-rose hover:text-rose-dark"
          >
            Xem lịch giao →
          </Link>
        </div>
        {todayDeliveries.length === 0 ? (
          <p className="text-sm text-ink-muted">Không có đơn nào cần giao hôm nay.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border-soft">
            {todayDeliveries.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-ivory-50 px-2.5 py-1 text-xs font-medium text-ink-soft">
                    {ORDER_TIME_SLOT_LABELS[order.deliveryTimeSlot]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{order.orderCode}</p>
                    <p className="text-xs text-ink-muted">{order.recipientName}</p>
                  </div>
                </div>
                <StatusBadge tone={STATUS_TONE[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </StatusBadge>
              </div>
            ))}
            {todayDeliveries.length > 5 && (
              <p className="pt-3 text-xs text-ink-muted">
                +{todayDeliveries.length - 5} đơn khác — xem đầy đủ ở lịch giao hoa.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

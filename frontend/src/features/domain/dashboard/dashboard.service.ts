import { api } from '@/lib/axios';
import type { OrderStatus } from '@/features/domain/orders/orders.service';

export type DashboardPeriod = '7d' | '30d' | '3m';

export type DashboardOverview = {
  revenue: { current: number; previous: number; changePercent: number | null };
  orders: { total: number; byStatus: Record<OrderStatus, number> };
  customers: { total: number; newInPeriod: number };
  products: { total: number };
  pendingReviews: number;
  topProducts: { productName: string; quantity: number }[];
};

export type RevenueChartPoint = { date: string; revenue: number };

export const dashboardService = {
  getOverview: (period: DashboardPeriod) =>
    api
      .get<{ data: DashboardOverview }>('/api/v1/admin/dashboard/overview', { params: { period } })
      .then((r) => r.data.data),

  getRevenueChart: (period: DashboardPeriod) =>
    api
      .get<{ data: RevenueChartPoint[] }>('/api/v1/admin/dashboard/revenue-chart', {
        params: { period },
      })
      .then((r) => r.data.data),
};

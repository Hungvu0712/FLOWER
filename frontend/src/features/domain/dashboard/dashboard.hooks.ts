'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardService, type DashboardPeriod } from './dashboard.service';

export function useDashboardOverview(period: DashboardPeriod) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'overview', period],
    queryFn: () => dashboardService.getOverview(period),
  });
}

export function useRevenueChart(period: DashboardPeriod) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'revenue-chart', period],
    queryFn: () => dashboardService.getRevenueChart(period),
  });
}

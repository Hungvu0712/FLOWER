import { z } from "zod";

// 3 khoảng cố định thay vì cho nhập ngày tuỳ ý — dashboard tổng quan chỉ cần vài mốc nhanh, không
// phải bộ lọc báo cáo chi tiết (xem `reports.view` — tương lai nếu cần lọc sâu hơn thì làm module
// report riêng, không nhét vào đây).
export const DASHBOARD_PERIODS = ["7d", "30d", "3m"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const dashboardOverviewQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).default("7d"),
});
export type DashboardOverviewQuery = z.infer<typeof dashboardOverviewQuerySchema>;

export const revenueChartQuerySchema = dashboardOverviewQuerySchema;
export type RevenueChartQuery = DashboardOverviewQuery;

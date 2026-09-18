import { asyncHandler } from "../../../shared/middleware";
import { ok } from "../../../shared/response/ApiResponse";
import * as service from "./dashboard.service";
import type { DashboardOverviewQuery, RevenueChartQuery } from "./dashboard.validation";

export const getOverview = asyncHandler(async (req, res) => {
  const { period } = req.query as unknown as DashboardOverviewQuery;
  const overview = await service.getOverview(period);
  ok(res, overview);
});

export const getRevenueChart = asyncHandler(async (req, res) => {
  const { period } = req.query as unknown as RevenueChartQuery;
  const points = await service.getRevenueChart(period);
  ok(res, points);
});

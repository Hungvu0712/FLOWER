import { Router } from "express";
import { authorize, validate } from "../../../shared/middleware";
import * as controller from "./dashboard.controller";
import { dashboardOverviewQuerySchema, revenueChartQuerySchema } from "./dashboard.validation";

// Mount với `authenticate` ở routes/v1/index.ts (prefix /api/v1/admin/dashboard). Tái dùng permission
// `reports.view` đã seed sẵn từ trước (domain.seed.ts, gán cho cả admin/super_admin, mô tả đúng "Xem
// thống kê doanh thu, báo cáo") — không tạo permission mới cho trang Tổng quan.
export const dashboardRouter = Router();
dashboardRouter.use(authorize("reports.view"));

dashboardRouter.get(
  "/overview",
  validate({ query: dashboardOverviewQuerySchema }),
  controller.getOverview,
);
dashboardRouter.get(
  "/revenue-chart",
  validate({ query: revenueChartQuerySchema }),
  controller.getRevenueChart,
);

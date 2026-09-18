import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { dashboardOverviewQuerySchema, revenueChartQuerySchema } from "./dashboard.validation";

const TAGS = ["Admin · Dashboard"];

const orderStatusCountsSchema = z.object({
  pending: z.number(),
  confirmed: z.number(),
  preparing: z.number(),
  delivering: z.number(),
  completed: z.number(),
  cancelled: z.number(),
});

const dashboardOverviewSchema = z.object({
  revenue: z.object({
    current: z.number(),
    previous: z.number(),
    changePercent: z.number().nullable().openapi({
      description: "% thay đổi so với kỳ trước — null nếu kỳ trước không có doanh thu để so sánh",
    }),
  }),
  orders: z.object({ total: z.number(), byStatus: orderStatusCountsSchema }),
  customers: z.object({ total: z.number(), newInPeriod: z.number() }),
  products: z.object({ total: z.number() }),
  pendingReviews: z.number(),
  topProducts: z.array(z.object({ productName: z.string(), quantity: z.number() })),
});

const revenueChartPointSchema = z.object({ date: z.string(), revenue: z.number() });

registerRoute({
  method: "get",
  path: "/api/v1/admin/dashboard/overview",
  tags: TAGS,
  summary: "Số liệu tổng quan trang Dashboard admin",
  description:
    "`revenue`/`customers.newInPeriod`/`topProducts` tính theo `period` (7 ngày/30 ngày/3 tháng, so " +
    "với kỳ liền trước cùng độ dài). `orders.byStatus` KHÔNG lọc theo period — là ảnh chụp hàng đợi " +
    "vận hành hiện tại, khác số liệu xu hướng.",
  auth: { permission: "reports.view" },
  request: { query: dashboardOverviewQuerySchema },
  response: { schema: dashboardOverviewSchema },
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/dashboard/revenue-chart",
  tags: TAGS,
  summary: "Dữ liệu biểu đồ doanh thu theo ngày",
  description:
    "Mảng đủ MỌI ngày trong khoảng đã chọn (ngày không có đơn = 0), loại trừ đơn đã huỷ.",
  auth: { permission: "reports.view" },
  request: { query: revenueChartQuerySchema },
  response: { schema: z.array(revenueChartPointSchema) },
});

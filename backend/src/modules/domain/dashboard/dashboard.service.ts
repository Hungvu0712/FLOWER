import { prisma } from "../../../config/prisma";
import { ORDER_STATUSES } from "../orders/orders.validation";
import type { DashboardPeriod } from "./dashboard.validation";

const PERIOD_DAYS: Record<DashboardPeriod, number> = { "7d": 7, "30d": 30, "3m": 90 };

function periodRange(period: DashboardPeriod) {
  const days = PERIOD_DAYS[period];
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);
  return { now, currentStart, previousStart };
}

async function sumRevenue(from: Date, to: Date): Promise<number> {
  // Loại trừ đơn đã huỷ — 'cancelled' không phải doanh thu thật, dù Order.total vẫn còn giá trị đã
  // tính lúc đặt (không xoá total khi huỷ, chỉ đổi status — xem orders.service.ts#updateStatus).
  const result = await prisma.order.aggregate({
    where: { status: { not: "cancelled" }, createdAt: { gte: from, lt: to } },
    _sum: { total: true },
  });
  return result._sum.total ?? 0;
}

// null = kỳ trước không có doanh thu để so sánh (tăng "vô hạn") — FE tự hiển thị "Mới" thay vì %.
function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function getOverview(period: DashboardPeriod) {
  const { now, currentStart, previousStart } = periodRange(period);

  const [
    currentRevenue,
    previousRevenue,
    orderCounts,
    customersTotal,
    customersNew,
    productsTotal,
    pendingReviews,
    topProductsRaw,
  ] = await Promise.all([
    sumRevenue(currentStart, now),
    sumRevenue(previousStart, currentStart),
    // KHÔNG lọc theo period — đây là ảnh chụp hàng đợi vận hành HIỆN TẠI (có bao nhiêu đơn đang ở mỗi
    // trạng thái ngay lúc này), khác doanh thu/khách mới là số liệu XU HƯỚNG theo khoảng thời gian.
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: currentStart } } }),
    prisma.product.count({ where: { deletedAt: null, isActive: true } }),
    prisma.review.count({ where: { isApproved: false } }),
    // Nhóm theo productName (snapshot, không JOIN sống tới Product) — đúng triết lý OrderItem đã có,
    // và tránh gộp nhầm khi productId null (sản phẩm gốc đã bị xoá cứng — hiếm nhưng schema cho phép).
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: { not: "cancelled" }, createdAt: { gte: currentStart, lt: now } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<
    (typeof ORDER_STATUSES)[number],
    number
  >;
  for (const row of orderCounts)
    byStatus[row.status as (typeof ORDER_STATUSES)[number]] = row._count._all;

  return {
    revenue: {
      current: currentRevenue,
      previous: previousRevenue,
      changePercent: changePercent(currentRevenue, previousRevenue),
    },
    orders: {
      total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
      byStatus,
    },
    customers: { total: customersTotal, newInPeriod: customersNew },
    products: { total: productsTotal },
    pendingReviews,
    topProducts: topProductsRaw.map((r) => ({
      productName: r.productName,
      quantity: r._sum.quantity ?? 0,
    })),
  };
}

export async function getRevenueChart(period: DashboardPeriod) {
  const { now, currentStart } = periodRange(period);
  const orders = await prisma.order.findMany({
    where: { status: { not: "cancelled" }, createdAt: { gte: currentStart, lt: now } },
    select: { total: true, createdAt: true },
  });

  const byDate = new Map<string, number>();
  for (const o of orders) {
    const key = o.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
    byDate.set(key, (byDate.get(key) ?? 0) + o.total);
  }

  // Điền đủ MỌI ngày trong khoảng (kể cả ngày không có đơn = 0) — biểu đồ liền mạch, không nhảy cóc
  // giữa các mốc có dữ liệu.
  const days = PERIOD_DAYS[period];
  const points: { date: string; revenue: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: key, revenue: byDate.get(key) ?? 0 });
  }
  return points;
}

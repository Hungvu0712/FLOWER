import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as service from "@/modules/domain/dashboard/dashboard.service";

beforeEach(() => {
  resetPrismaMock();
  // Mặc định "rỗng" cho mọi lời gọi trong getOverview — từng test chỉ override đúng phần đang kiểm
  // tra, tránh phải mock đủ cả 8 lời gọi Promise.all() ở mỗi test.
  db.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
  db.order.groupBy.mockResolvedValue([]);
  db.user.count.mockResolvedValue(0);
  db.product.count.mockResolvedValue(0);
  db.review.count.mockResolvedValue(0);
  db.orderItem.groupBy.mockResolvedValue([]);
  db.order.findMany.mockResolvedValue([]);
});

describe("getOverview — doanh thu", () => {
  it("loại trừ đơn cancelled khi tính tổng doanh thu (where.status.not = 'cancelled')", async () => {
    await service.getOverview("7d");
    const where = db.order.aggregate.mock.calls[0]![0].where;
    expect(where.status).toEqual({ not: "cancelled" });
  });

  it("changePercent dương khi kỳ này cao hơn kỳ trước", async () => {
    db.order.aggregate
      .mockResolvedValueOnce({ _sum: { total: 1_500_000 } }) // kỳ hiện tại
      .mockResolvedValueOnce({ _sum: { total: 1_000_000 } }); // kỳ trước
    const result = await service.getOverview("7d");
    expect(result.revenue).toEqual({ current: 1_500_000, previous: 1_000_000, changePercent: 50 });
  });

  it("changePercent âm khi kỳ này thấp hơn kỳ trước", async () => {
    db.order.aggregate
      .mockResolvedValueOnce({ _sum: { total: 500_000 } })
      .mockResolvedValueOnce({ _sum: { total: 1_000_000 } });
    const result = await service.getOverview("7d");
    expect(result.revenue.changePercent).toBe(-50);
  });

  it("kỳ trước = 0 và kỳ này > 0 → changePercent null (không có gì để so sánh, không phải chia cho 0)", async () => {
    db.order.aggregate
      .mockResolvedValueOnce({ _sum: { total: 200_000 } })
      .mockResolvedValueOnce({ _sum: { total: 0 } });
    const result = await service.getOverview("7d");
    expect(result.revenue.changePercent).toBeNull();
  });

  it("cả 2 kỳ đều 0 → changePercent = 0 (không phải null)", async () => {
    const result = await service.getOverview("7d");
    expect(result.revenue).toEqual({ current: 0, previous: 0, changePercent: 0 });
  });

  it("_sum.total = null (không có đơn nào khớp) → coi là 0, không throw", async () => {
    db.order.aggregate.mockResolvedValue({ _sum: { total: null } });
    const result = await service.getOverview("7d");
    expect(result.revenue.current).toBe(0);
  });
});

describe("getOverview — đơn hàng theo trạng thái", () => {
  it("KHÔNG lọc theo period — ảnh chụp hàng đợi hiện tại, không có where.createdAt", async () => {
    await service.getOverview("7d");
    const args = db.order.groupBy.mock.calls[0]![0];
    expect(args.where).toBeUndefined();
  });

  it("gộp đúng số đếm theo từng trạng thái, trạng thái không có đơn nào = 0", async () => {
    db.order.groupBy.mockResolvedValue([
      { status: "pending", _count: { _all: 5 } },
      { status: "completed", _count: { _all: 20 } },
    ]);
    const result = await service.getOverview("7d");
    expect(result.orders.byStatus).toEqual({
      pending: 5,
      confirmed: 0,
      preparing: 0,
      delivering: 0,
      completed: 20,
      cancelled: 0,
    });
    expect(result.orders.total).toBe(25);
  });
});

describe("getOverview — khách hàng, sản phẩm, đánh giá chờ duyệt", () => {
  it("customers.total/newInPeriod và products.total lấy đúng từ count() tương ứng", async () => {
    db.user.count.mockResolvedValueOnce(1245).mockResolvedValueOnce(38);
    db.product.count.mockResolvedValue(186);
    const result = await service.getOverview("7d");
    expect(result.customers).toEqual({ total: 1245, newInPeriod: 38 });
    expect(result.products).toEqual({ total: 186 });
  });

  it("chỉ đếm user CHƯA xoá mềm (deletedAt: null) cho cả total lẫn newInPeriod", async () => {
    await service.getOverview("7d");
    expect(db.user.count.mock.calls[0]![0].where).toMatchObject({ deletedAt: null });
    expect(db.user.count.mock.calls[1]![0].where).toMatchObject({ deletedAt: null });
  });

  it("pendingReviews đếm đúng review isApproved: false", async () => {
    db.review.count.mockResolvedValue(4);
    const result = await service.getOverview("7d");
    expect(db.review.count.mock.calls[0]![0].where).toEqual({ isApproved: false });
    expect(result.pendingReviews).toBe(4);
  });
});

describe("getOverview — sản phẩm bán chạy", () => {
  it("map đúng thứ tự đã sắp xếp sẵn từ groupBy (theo quantity giảm dần)", async () => {
    db.orderItem.groupBy.mockResolvedValue([
      { productName: "Hoa hồng đỏ 99 bông", _sum: { quantity: 32 } },
      { productName: "Bó tulip trắng", _sum: { quantity: 27 } },
    ]);
    const result = await service.getOverview("7d");
    expect(result.topProducts).toEqual([
      { productName: "Hoa hồng đỏ 99 bông", quantity: 32 },
      { productName: "Bó tulip trắng", quantity: 27 },
    ]);
  });

  it("loại trừ đơn cancelled — where lồng theo order.status", async () => {
    await service.getOverview("7d");
    const args = db.orderItem.groupBy.mock.calls[0]![0];
    expect(args.where.order.status).toEqual({ not: "cancelled" });
  });
});

describe("getRevenueChart", () => {
  it("7d trả về đủ 7 điểm, kể cả ngày không có đơn nào (revenue = 0)", async () => {
    db.order.findMany.mockResolvedValue([]);
    const points = await service.getRevenueChart("7d");
    expect(points).toHaveLength(7);
    expect(points.every((p) => p.revenue === 0)).toBe(true);
  });

  it("gộp đúng tổng revenue theo từng ngày (nhiều đơn cùng ngày cộng dồn)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    db.order.findMany.mockResolvedValue([
      { total: 100_000, createdAt: new Date(`${today}T08:00:00.000Z`) },
      { total: 200_000, createdAt: new Date(`${today}T15:00:00.000Z`) },
    ]);
    const points = await service.getRevenueChart("7d");
    const todayPoint = points.find((p) => p.date === today);
    expect(todayPoint?.revenue).toBe(300_000);
  });

  it("loại trừ đơn cancelled", async () => {
    await service.getRevenueChart("30d");
    const where = db.order.findMany.mock.calls[0]![0].where;
    expect(where.status).toEqual({ not: "cancelled" });
  });

  it("3m trả về 90 điểm", async () => {
    const points = await service.getRevenueChart("3m");
    expect(points).toHaveLength(90);
  });
});

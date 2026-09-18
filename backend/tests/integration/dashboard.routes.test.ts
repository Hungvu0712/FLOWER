import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

beforeEach(() => {
  resetPrismaMock();
  db.order.aggregate.mockResolvedValue({ _sum: { total: 0 } });
  db.order.groupBy.mockResolvedValue([]);
  db.user.count.mockResolvedValue(0);
  db.product.count.mockResolvedValue(0);
  db.review.count.mockResolvedValue(0);
  db.orderItem.groupBy.mockResolvedValue([]);
  db.order.findMany.mockResolvedValue([]);
});

describe("GET /api/v1/admin/dashboard/overview", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard/overview");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu reports.view (đăng nhập nhưng chưa được gán quyền)", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    const res = await request(app).get("/api/v1/admin/dashboard/overview").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("đủ quyền reports.view → 200, trả đủ cấu trúc số liệu", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["reports.view"]);
    const res = await request(app).get("/api/v1/admin/dashboard/overview").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("revenue");
    expect(res.body.data).toHaveProperty("orders");
    expect(res.body.data).toHaveProperty("topProducts");
  });

  it("422 khi period không hợp lệ", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["reports.view"]);
    const res = await request(app)
      .get("/api/v1/admin/dashboard/overview?period=1y")
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/admin/dashboard/revenue-chart", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard/revenue-chart");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu reports.view", async () => {
    const cookie = loginAs("florist-1", ["florist"], ["orders.view_delivery_queue"]);
    const res = await request(app)
      .get("/api/v1/admin/dashboard/revenue-chart")
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("đủ quyền reports.view → 200, trả mảng điểm dữ liệu", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["reports.view"]);
    const res = await request(app)
      .get("/api/v1/admin/dashboard/revenue-chart?period=30d")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(30);
  });
});

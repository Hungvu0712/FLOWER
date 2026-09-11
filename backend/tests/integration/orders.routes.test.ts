import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";

const FUTURE_DATE = "2999-01-01";

const VALID_BODY = {
  items: [{ productId: "11111111-1111-1111-1111-111111111111", quantity: 2 }],
  recipientName: "Trần Thị B",
  recipientPhone: "0900000000",
  deliveryAddress: "123 Đường Hoa, Q1",
  deliveryDate: FUTURE_DATE,
  deliveryTimeSlot: "sang",
};

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  db.order.findUnique.mockResolvedValue(null);
  db.orderItem.createMany.mockResolvedValue({});
});

describe("POST /api/v1/orders (công khai — guest checkout)", () => {
  it("tạo đơn thành công, KHÔNG cần đăng nhập, trả 201", async () => {
    db.product.findMany.mockResolvedValue([
      { id: "11111111-1111-1111-1111-111111111111", name: "Hoa hồng", basePrice: 100000 },
    ]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({
      id: "o1",
      orderCode: "HX2609100001",
      status: "pending",
    });

    const res = await request(app).post("/api/v1/orders").send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe("o1");
  });

  it("422 khi field honeypot 'website' có giá trị (bot điền form tự động)", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .send({ ...VALID_BODY, website: "http://spam.example" });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("INVALID_SUBMISSION");
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("422 khi giỏ hàng rỗng", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .send({ ...VALID_BODY, items: [] });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("items");
  });

  it("422 khi ngày giao ở quá khứ", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .send({ ...VALID_BODY, deliveryDate: "2020-01-01" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("deliveryDate");
  });

  it("422 khi thiếu recipientPhone", async () => {
    const { recipientPhone: _drop, ...withoutPhone } = VALID_BODY;
    const res = await request(app).post("/api/v1/orders").send(withoutPhone);
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("recipientPhone");
  });

  it("409 PRODUCT_UNAVAILABLE khi sản phẩm trong giỏ không còn khả dụng", async () => {
    db.product.findMany.mockResolvedValue([]);
    const res = await request(app).post("/api/v1/orders").send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("đã đăng nhập vẫn đặt được, đơn gắn với userId từ cookie", async () => {
    const cookie = loginAs("user-1", ["member"], []);
    db.product.findMany.mockResolvedValue([
      { id: "11111111-1111-1111-1111-111111111111", name: "Hoa hồng", basePrice: 100000 },
    ]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    const res = await request(app).post("/api/v1/orders").set("Cookie", cookie).send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(db.order.create.mock.calls[0]![0].data.userId).toBe("user-1");
  });
});

describe("GET /api/v1/orders/:id (công khai — tra cứu qua link)", () => {
  it("trả đơn khi id đúng, KHÔNG cần đăng nhập", async () => {
    const id = "22222222-2222-2222-2222-222222222222";
    db.order.findUnique.mockResolvedValue({ id, orderCode: "HX2609100001", items: [] });
    const res = await request(app).get(`/api/v1/orders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it("404 khi id không tồn tại", async () => {
    const id = "33333333-3333-3333-3333-333333333333";
    db.order.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/api/v1/orders/${id}`);
    expect(res.status).toBe(404);
  });

  it("422 khi id không phải UUID (chặn dò định dạng khác)", async () => {
    const res = await request(app).get("/api/v1/orders/abc");
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/account/orders — row-level check cho module domain (docs/12 §5.1)", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/account/orders");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu orders.view_own (đăng nhập nhưng chưa được gán quyền)", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app).get("/api/v1/account/orders").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("đủ quyền → CHỈ truy vấn đơn của ĐÚNG user đang đăng nhập, không phải toàn bộ đơn", async () => {
    const cookie = loginAs("member-1", ["member"], ["orders.view_own"]);
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);

    const res = await request(app).get("/api/v1/account/orders").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({ userId: "member-1" });
  });

  it("2 khách khác nhau gọi cùng endpoint → mỗi lần lọc đúng userId của CHÍNH người gọi đó", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);

    const cookieA = loginAs("member-a", ["member"], ["orders.view_own"]);
    await request(app).get("/api/v1/account/orders").set("Cookie", cookieA);
    const cookieB = loginAs("member-b", ["member"], ["orders.view_own"]);
    await request(app).get("/api/v1/account/orders").set("Cookie", cookieB);

    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({ userId: "member-a" });
    expect(db.order.findMany.mock.calls[1]![0].where).toEqual({ userId: "member-b" });
  });
});

describe("GET /api/v1/admin/orders", () => {
  it("liệt kê đơn cho staff có orders.view_all", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/admin/orders").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("403 khi thiếu orders.view_all", async () => {
    const cookie = loginAs("staff-1", ["florist"], ["orders.update_status"]);
    const res = await request(app).get("/api/v1/admin/orders").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/admin/orders/:id/status", () => {
  const id = "44444444-4444-4444-4444-444444444444";

  it("florist có orders.update_status: chuyển 'preparing' thành công", async () => {
    const cookie = loginAs("florist-1", ["florist"], ["orders.update_status"]);
    db.order.findUnique.mockResolvedValue({ id, status: "confirmed" });
    db.order.update.mockResolvedValue({ id, status: "preparing" });

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set("Cookie", cookie)
      .send({ status: "preparing" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("preparing");
  });

  it("florist KHÔNG có orders.cancel: huỷ đơn bị 403 dù có orders.update_status", async () => {
    const cookie = loginAs("florist-1", ["florist"], ["orders.update_status"]);
    db.order.findUnique.mockResolvedValue({ id, status: "pending" });

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set("Cookie", cookie)
      .send({ status: "cancelled" });
    expect(res.status).toBe(403);
  });

  it("sales_staff có orders.cancel: huỷ đơn thành công", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.cancel"]);
    db.order.findUnique.mockResolvedValue({ id, status: "pending" });
    db.order.update.mockResolvedValue({ id, status: "cancelled" });

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set("Cookie", cookie)
      .send({ status: "cancelled" });
    expect(res.status).toBe(200);
  });

  it("422 khi status không nằm trong danh sách cho phép", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.update_status"]);
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set("Cookie", cookie)
      .send({ status: "khong-hop-le" });
    expect(res.status).toBe(422);
  });

  it("member (không có permission nào) bị 403", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.order.findUnique.mockResolvedValue({ id, status: "pending" });
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${id}/status`)
      .set("Cookie", cookie)
      .send({ status: "confirmed" });
    expect(res.status).toBe(403);
  });
});

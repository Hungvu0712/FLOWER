import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

const ID = "77777777-7777-7777-7777-777777777777";
const ACTIVE_COUPON = {
  id: ID,
  code: "SALE10",
  type: "percent",
  value: 10,
  minOrderValue: null,
  startDate: null,
  endDate: null,
  usageLimit: null,
  usedCount: 0,
  isActive: true,
};

beforeEach(() => resetPrismaMock());

describe("POST /api/v1/coupons/validate (công khai)", () => {
  it("không cần đăng nhập, trả số tiền được giảm khi mã hợp lệ", async () => {
    db.coupon.findUnique.mockResolvedValue(ACTIVE_COUPON);
    const res = await request(app)
      .post("/api/v1/coupons/validate")
      .send({ code: "sale10", subtotal: 100000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      code: "SALE10",
      type: "percent",
      value: 10,
      discountAmount: 10000,
    });
  });

  it("404 COUPON_NOT_FOUND khi mã không tồn tại", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/coupons/validate")
      .send({ code: "KHONGCO", subtotal: 100000 });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("COUPON_NOT_FOUND");
  });

  it("422 khi thiếu subtotal", async () => {
    const res = await request(app).post("/api/v1/coupons/validate").send({ code: "SALE10" });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/admin/coupons", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/coupons");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu permission promotions.manage", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    const res = await request(app).get("/api/v1/admin/coupons").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("200 khi đủ quyền promotions.manage", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findMany.mockResolvedValue([ACTIVE_COUPON]);
    db.coupon.count.mockResolvedValue(1);
    const res = await request(app).get("/api/v1/admin/coupons").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/admin/coupons", () => {
  it("tạo thành công, trả 201", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValue(null);
    db.coupon.create.mockResolvedValue(ACTIVE_COUPON);
    const res = await request(app)
      .post("/api/v1/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "SALE10", type: "percent", value: 10 });
    expect(res.status).toBe(201);
  });

  it("422 khi value % vượt quá 100", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    const res = await request(app)
      .post("/api/v1/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "SALE200", type: "percent", value: 200 });
    expect(res.status).toBe(422);
  });

  it("409 khi mã đã tồn tại", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValue(ACTIVE_COUPON);
    const res = await request(app)
      .post("/api/v1/admin/coupons")
      .set("Cookie", cookie)
      .send({ code: "SALE10", type: "percent", value: 10 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("COUPON_CODE_EXISTS");
  });
});

describe("PATCH /api/v1/admin/coupons/:id", () => {
  it("cập nhật thành công khi hợp lệ", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValueOnce(ACTIVE_COUPON).mockResolvedValueOnce(null);
    db.coupon.update.mockResolvedValue({ ...ACTIVE_COUPON, value: 15 });
    const res = await request(app)
      .patch(`/api/v1/admin/coupons/${ID}`)
      .set("Cookie", cookie)
      .send({ value: 15 });
    expect(res.status).toBe(200);
  });

  it("422 khi PATCH {value: 500} lên mã ĐANG là percent mà không gửi kèm type — validate lại theo bản ghi sau khi merge, không chỉ field gửi lên (review VAL-01)", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValueOnce(ACTIVE_COUPON); // type: "percent" có sẵn trong DB
    const res = await request(app)
      .patch(`/api/v1/admin/coupons/${ID}`)
      .set("Cookie", cookie)
      .send({ value: 500 });
    expect(res.status).toBe(422);
    expect(db.coupon.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/admin/coupons/:id", () => {
  it("xoá thành công khi chưa từng dùng", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValue({ ...ACTIVE_COUPON, usedCount: 0 });
    db.coupon.delete.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/admin/coupons/${ID}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("409 COUPON_IN_USE khi mã đã từng được dùng", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["promotions.manage"]);
    db.coupon.findUnique.mockResolvedValue({ ...ACTIVE_COUPON, usedCount: 2 });
    const res = await request(app).delete(`/api/v1/admin/coupons/${ID}`).set("Cookie", cookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("COUPON_IN_USE");
  });
});

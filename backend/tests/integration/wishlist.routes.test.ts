import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

beforeEach(() => resetPrismaMock());

describe("GET /api/v1/account/wishlist", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/account/wishlist");
    expect(res.status).toBe(401);
  });

  it("KHÔNG cần permission gì thêm ngoài đăng nhập", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.wishlist.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/v1/account/wishlist").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("2 khách khác nhau → mỗi lần lọc đúng userId của CHÍNH người gọi đó", async () => {
    db.wishlist.findMany.mockResolvedValue([]);
    const cookieA = loginAs("member-a", ["member"], []);
    await request(app).get("/api/v1/account/wishlist").set("Cookie", cookieA);
    const cookieB = loginAs("member-b", ["member"], []);
    await request(app).get("/api/v1/account/wishlist").set("Cookie", cookieB);
    expect(db.wishlist.findMany.mock.calls[0]![0].where.userId).toBe("member-a");
    expect(db.wishlist.findMany.mock.calls[1]![0].where.userId).toBe("member-b");
  });
});

describe("POST /api/v1/account/wishlist", () => {
  it("thêm thành công, trả 201", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.product.findFirst.mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111" });
    db.wishlist.findUnique.mockResolvedValue(null);
    db.wishlist.create.mockResolvedValue({});
    const res = await request(app)
      .post("/api/v1/account/wishlist")
      .set("Cookie", cookie)
      .send({ productId: "11111111-1111-1111-1111-111111111111" });
    expect(res.status).toBe(201);
  });

  it("404 khi sản phẩm không tồn tại", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.product.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/account/wishlist")
      .set("Cookie", cookie)
      .send({ productId: "22222222-2222-2222-2222-222222222222" });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("422 khi productId không phải UUID", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/account/wishlist")
      .set("Cookie", cookie)
      .send({ productId: "abc" });
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/v1/account/wishlist/:productId", () => {
  it("xoá thành công, trả 200 (idempotent — không cần tồn tại trước)", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.wishlist.deleteMany.mockResolvedValue({ count: 0 });
    const res = await request(app)
      .delete("/api/v1/account/wishlist/33333333-3333-3333-3333-333333333333")
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

beforeEach(() => resetPrismaMock());

describe("GET /api/v1/reviews (công khai)", () => {
  it("không cần đăng nhập, chỉ trả đánh giá đã duyệt", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    const res = await request(app).get(
      "/api/v1/reviews?productId=11111111-1111-1111-1111-111111111111",
    );
    expect(res.status).toBe(200);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({
      productId: "11111111-1111-1111-1111-111111111111",
      isApproved: true,
    });
  });

  it("422 khi thiếu productId", async () => {
    const res = await request(app).get("/api/v1/reviews");
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/account/reviews", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app)
      .post("/api/v1/account/reviews")
      .send({ productId: "11111111-1111-1111-1111-111111111111", rating: 5 });
    expect(res.status).toBe(401);
  });

  it("tạo thành công, trả 201, KHÔNG cần permission gì thêm", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.product.findFirst.mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111" });
    db.review.findUnique.mockResolvedValue(null);
    db.review.create.mockResolvedValue({ id: "r1" });
    const res = await request(app)
      .post("/api/v1/account/reviews")
      .set("Cookie", cookie)
      .send({ productId: "11111111-1111-1111-1111-111111111111", rating: 5, comment: "Đẹp" });
    expect(res.status).toBe(201);
  });

  it("422 khi rating ngoài khoảng 1-5", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/account/reviews")
      .set("Cookie", cookie)
      .send({ productId: "11111111-1111-1111-1111-111111111111", rating: 0 });
    expect(res.status).toBe(422);
  });

  it("409 khi đã đánh giá sản phẩm này rồi", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.product.findFirst.mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111" });
    db.review.findUnique.mockResolvedValue({ id: "r-cu" });
    const res = await request(app)
      .post("/api/v1/account/reviews")
      .set("Cookie", cookie)
      .send({ productId: "11111111-1111-1111-1111-111111111111", rating: 4 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("REVIEW_ALREADY_EXISTS");
  });
});

describe("GET /api/v1/admin/reviews — hàng đợi duyệt", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/reviews");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu reviews.moderate", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    const res = await request(app).get("/api/v1/admin/reviews").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("200 khi đủ quyền reviews.moderate", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["reviews.moderate"]);
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/admin/reviews").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/v1/admin/reviews/:id", () => {
  it("duyệt thành công", async () => {
    const id = "44444444-4444-4444-4444-444444444444";
    const cookie = loginAs("admin-1", ["admin"], ["reviews.moderate"]);
    db.review.findUnique.mockResolvedValue({ id, isApproved: false });
    db.review.update.mockResolvedValue({ id, isApproved: true });
    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${id}`)
      .set("Cookie", cookie)
      .send({ isApproved: true });
    expect(res.status).toBe(200);
  });

  it("404 khi đánh giá không tồn tại", async () => {
    const id = "55555555-5555-5555-5555-555555555555";
    const cookie = loginAs("admin-1", ["admin"], ["reviews.moderate"]);
    db.review.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/v1/admin/reviews/${id}`)
      .set("Cookie", cookie)
      .send({ isApproved: true });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/admin/reviews/:id", () => {
  it("xoá thành công", async () => {
    const id = "66666666-6666-6666-6666-666666666666";
    const cookie = loginAs("admin-1", ["admin"], ["reviews.moderate"]);
    db.review.findUnique.mockResolvedValue({ id });
    db.review.delete.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/admin/reviews/${id}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá đánh giá");
  });
});

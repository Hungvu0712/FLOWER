import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

beforeEach(() => resetPrismaMock());

describe("GET /api/v1/account/addresses", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/account/addresses");
    expect(res.status).toBe(401);
  });

  it("KHÔNG cần permission gì thêm ngoài đăng nhập — member thường cũng gọi được", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.address.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/v1/account/addresses").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("2 khách khác nhau gọi cùng endpoint → mỗi lần lọc đúng userId của CHÍNH người gọi đó", async () => {
    db.address.findMany.mockResolvedValue([]);
    const cookieA = loginAs("member-a", ["member"], []);
    await request(app).get("/api/v1/account/addresses").set("Cookie", cookieA);
    const cookieB = loginAs("member-b", ["member"], []);
    await request(app).get("/api/v1/account/addresses").set("Cookie", cookieB);
    expect(db.address.findMany.mock.calls[0]![0].where).toEqual({ userId: "member-a" });
    expect(db.address.findMany.mock.calls[1]![0].where).toEqual({ userId: "member-b" });
  });
});

describe("POST /api/v1/account/addresses", () => {
  it("tạo địa chỉ, trả 201", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.address.count.mockResolvedValue(0);
    db.address.create.mockResolvedValue({ id: "addr-1" });

    const res = await request(app).post("/api/v1/account/addresses").set("Cookie", cookie).send({
      recipientName: "Nguyễn Văn A",
      recipientPhone: "0900000000",
      addressLine: "123 Đường X",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Created");
  });

  it("422 khi thiếu recipientName", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/account/addresses")
      .set("Cookie", cookie)
      .send({ recipientPhone: "0900000000", addressLine: "123 Đường X" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("recipientName");
  });
});

describe("PATCH /api/v1/account/addresses/:id — chống IDOR", () => {
  it("422 khi :id không phải UUID", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .patch("/api/v1/account/addresses/abc")
      .set("Cookie", cookie)
      .send({ recipientName: "B" });
    expect(res.status).toBe(422);
  });

  it("404 khi sửa địa chỉ KHÔNG THUỘC user đang đăng nhập (giả lập bằng findFirst trả null)", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const cookie = loginAs("member-a", ["member"], []);
    db.address.findFirst.mockResolvedValue(null); // findFirst({where:{id, userId: 'member-a'}}) không khớp
    const res = await request(app)
      .patch(`/api/v1/account/addresses/${id}`)
      .set("Cookie", cookie)
      .send({ recipientName: "Hack" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/account/addresses/:id", () => {
  it("404 khi xoá địa chỉ không thuộc về mình", async () => {
    const id = "22222222-2222-2222-2222-222222222222";
    const cookie = loginAs("member-a", ["member"], []);
    db.address.findFirst.mockResolvedValue(null);
    const res = await request(app).delete(`/api/v1/account/addresses/${id}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("xoá được địa chỉ của chính mình", async () => {
    const id = "33333333-3333-3333-3333-333333333333";
    const cookie = loginAs("member-a", ["member"], []);
    db.address.findFirst.mockResolvedValue({ id, userId: "member-a" });
    db.address.delete.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/account/addresses/${id}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá địa chỉ");
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

beforeEach(() => resetPrismaMock());

describe("GET /api/v1/account/special-dates", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/account/special-dates");
    expect(res.status).toBe(401);
  });

  it("KHÔNG cần permission gì thêm ngoài đăng nhập — member thường cũng gọi được", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.specialDate.findMany.mockResolvedValue([]);
    const res = await request(app).get("/api/v1/account/special-dates").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("2 khách khác nhau gọi cùng endpoint → mỗi lần lọc đúng userId của CHÍNH người gọi đó", async () => {
    db.specialDate.findMany.mockResolvedValue([]);
    const cookieA = loginAs("member-a", ["member"], []);
    await request(app).get("/api/v1/account/special-dates").set("Cookie", cookieA);
    const cookieB = loginAs("member-b", ["member"], []);
    await request(app).get("/api/v1/account/special-dates").set("Cookie", cookieB);
    expect(db.specialDate.findMany.mock.calls[0]![0].where).toEqual({ userId: "member-a" });
    expect(db.specialDate.findMany.mock.calls[1]![0].where).toEqual({ userId: "member-b" });
  });
});

describe("POST /api/v1/account/special-dates", () => {
  it("tạo ngày đặc biệt, trả 201", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    db.specialDate.create.mockResolvedValue({ id: "sd-1" });

    const res = await request(app)
      .post("/api/v1/account/special-dates")
      .set("Cookie", cookie)
      .send({ label: "Sinh nhật mẹ", date: "2000-05-15" });

    expect(res.status).toBe(201);
  });

  it("422 khi thiếu label", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/account/special-dates")
      .set("Cookie", cookie)
      .send({ date: "2000-05-15" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("label");
  });

  it("422 khi date sai định dạng", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/account/special-dates")
      .set("Cookie", cookie)
      .send({ label: "X", date: "15/05/2000" });
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/v1/account/special-dates/:id — chống IDOR", () => {
  it("404 khi sửa ngày đặc biệt KHÔNG THUỘC user đang đăng nhập", async () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const cookie = loginAs("member-a", ["member"], []);
    db.specialDate.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/v1/account/special-dates/${id}`)
      .set("Cookie", cookie)
      .send({ label: "Hack" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/account/special-dates/:id", () => {
  it("404 khi xoá ngày đặc biệt không thuộc về mình", async () => {
    const id = "22222222-2222-2222-2222-222222222222";
    const cookie = loginAs("member-a", ["member"], []);
    db.specialDate.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .delete(`/api/v1/account/special-dates/${id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("xoá được ngày đặc biệt của chính mình", async () => {
    const id = "33333333-3333-3333-3333-333333333333";
    const cookie = loginAs("member-a", ["member"], []);
    db.specialDate.findFirst.mockResolvedValue({ id, userId: "member-a" });
    db.specialDate.delete.mockResolvedValue({});
    const res = await request(app)
      .delete(`/api/v1/account/special-dates/${id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá ngày đặc biệt");
  });
});

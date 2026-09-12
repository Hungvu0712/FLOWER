import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

const ID = "99999999-9999-9999-9999-999999999999";

beforeEach(() => resetPrismaMock());

describe("POST /api/v1/newsletter/subscribe (công khai)", () => {
  it("không cần đăng nhập, đăng ký thành công", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    db.newsletterSubscriber.create.mockResolvedValue({});
    const res = await request(app)
      .post("/api/v1/newsletter/subscribe")
      .send({ email: "khach@example.com" });
    expect(res.status).toBe(200);
  });

  it("422 khi email không hợp lệ", async () => {
    const res = await request(app)
      .post("/api/v1/newsletter/subscribe")
      .send({ email: "khong-phai-email" });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/newsletter/unsubscribe (công khai)", () => {
  it("luôn trả 200 dù email có tồn tại hay không (chống dò email)", async () => {
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/newsletter/unsubscribe")
      .send({ email: "khong-ton-tai@example.com" });
    expect(res.status).toBe(200);
  });
});

describe("GET /api/v1/admin/newsletter", () => {
  it("401 khi chưa đăng nhập", async () => {
    const res = await request(app).get("/api/v1/admin/newsletter");
    expect(res.status).toBe(401);
  });

  it("403 khi thiếu permission blog.manage", async () => {
    const cookie = loginAs("staff-1", ["sales_staff"], ["orders.view_all"]);
    const res = await request(app).get("/api/v1/admin/newsletter").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("200 khi đủ quyền blog.manage", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.newsletterSubscriber.findMany.mockResolvedValue([]);
    db.newsletterSubscriber.count.mockResolvedValue(0);
    const res = await request(app).get("/api/v1/admin/newsletter").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/v1/admin/newsletter/:id", () => {
  it("404 khi không tìm thấy người đăng ký", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.newsletterSubscriber.findUnique.mockResolvedValue(null);
    const res = await request(app).delete(`/api/v1/admin/newsletter/${ID}`).set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("xoá thành công", async () => {
    const cookie = loginAs("admin-1", ["admin"], ["blog.manage"]);
    db.newsletterSubscriber.findUnique.mockResolvedValue({ id: ID, email: "x@example.com" });
    db.newsletterSubscriber.delete.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/admin/newsletter/${ID}`).set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

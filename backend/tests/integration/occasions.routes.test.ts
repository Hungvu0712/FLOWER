import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

let adminCookie: string[];

beforeEach(() => {
  resetPrismaMock();
  // Dùng LẠI permission categories.manage (không có occasions.manage riêng) — xem occasions.admin.routes.ts.
  adminCookie = loginAs("admin-1", ["admin"], ["categories.manage"]);
  db.auditLog.create.mockResolvedValue({});
});

describe("GET /api/v1/admin/occasions", () => {
  it("?includeInactive=false KHÔNG bị hiểu nhầm thành true qua query string thật", async () => {
    db.occasion.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/v1/admin/occasions?includeInactive=false")
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(db.occasion.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });
});

describe("POST /api/v1/admin/occasions", () => {
  it("tạo dịp lễ, tự sinh slug từ tên tiếng Việt, trả 201", async () => {
    db.occasion.findFirst.mockResolvedValue(null);
    db.occasion.create.mockResolvedValue({ id: "o1", name: "Sinh nhật", slug: "sinh-nhat" });

    const res = await request(app)
      .post("/api/v1/admin/occasions")
      .set("Cookie", adminCookie)
      .send({ name: "Sinh nhật" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Created");
    expect(db.occasion.create.mock.calls[0]![0].data.slug).toBe("sinh-nhat");
  });

  it("422 khi thiếu tên", async () => {
    const res = await request(app)
      .post("/api/v1/admin/occasions")
      .set("Cookie", adminCookie)
      .send({});
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("name");
  });
});

describe("PATCH /api/v1/admin/occasions/:id", () => {
  it("422 khi :id không phải UUID", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/occasions/abc")
      .set("Cookie", adminCookie)
      .send({ name: "X" });
    expect(res.status).toBe(422);
  });

  it("404 khi dịp lễ không tồn tại", async () => {
    const id = "55555555-5555-5555-5555-555555555555";
    db.occasion.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch(`/api/v1/admin/occasions/${id}`)
      .set("Cookie", adminCookie)
      .send({ name: "X" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/admin/occasions/:id", () => {
  it("xoá được kể cả khi còn sản phẩm đang gắn (chỉ gỡ tag)", async () => {
    const id = "99999999-9999-9999-9999-999999999999";
    db.occasion.findUnique.mockResolvedValue({ id });
    db.occasion.delete.mockResolvedValue({});
    const res = await request(app)
      .delete(`/api/v1/admin/occasions/${id}`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Đã xoá dịp lễ");
  });
});

describe("GET /api/v1/occasions (công khai)", () => {
  it("không cần đăng nhập, chỉ trả dịp lễ đang bật và không lộ trường nội bộ", async () => {
    db.occasion.findMany.mockResolvedValue([{ id: "o1", name: "Sinh nhật", slug: "sinh-nhat" }]);
    const res = await request(app).get("/api/v1/occasions");
    expect(res.status).toBe(200);
    expect(res.body.data[0]).not.toHaveProperty("sortOrder");
    expect(db.occasion.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

describe("Public — GET /api/v1/site-content", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  it("không cần đăng nhập vẫn đọc được (200)", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "hotline", value: JSON.stringify("0900 000 000"), updatedAt: new Date() },
    ]);
    const res = await request(app).get("/api/v1/site-content");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { key: "hotline", value: "0900 000 000", updatedAt: expect.any(String) },
    ]);
  });
});

describe("Admin — PATCH /api/v1/admin/site-content/:key", () => {
  let adminCookie: string[];

  beforeEach(() => {
    resetPrismaMock();
    adminCookie = loginAs("admin-1", ["admin"], ["site_content.manage"]);
    db.auditLog.create.mockResolvedValue({});
  });

  it("hotline hợp lệ → 200, giá trị đã lưu đúng string", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "hotline",
      value: JSON.stringify("0911 111 111"),
      updatedAt: new Date(),
    });
    const res = await request(app)
      .patch("/api/v1/admin/site-content/hotline")
      .set("Cookie", adminCookie)
      .send({ value: "0911 111 111" });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe("0911 111 111");
  });

  it("zalo_link gửi giá trị SAI KIỂU (không phải URL) → 422", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/site-content/zalo_link")
      .set("Cookie", adminCookie)
      .send({ value: "khong-phai-url" });
    expect(res.status).toBe(422);
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("key không nằm trong danh sách hợp lệ → 422 (params z.enum chặn ở validate())", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/site-content/khong-ton-tai")
      .set("Cookie", adminCookie)
      .send({ value: "x" });
    expect(res.status).toBe(422);
  });

  it("super_admin cũng sửa được (site_content.manage cấp cho cả 2 role, không chỉ admin)", async () => {
    const superAdminCookie = loginAs("superadmin-1", ["super_admin"], ["site_content.manage"]);
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "address",
      value: JSON.stringify("456 Đường Mới"),
      updatedAt: new Date(),
    });
    const res = await request(app)
      .patch("/api/v1/admin/site-content/address")
      .set("Cookie", superAdminCookie)
      .send({ value: "456 Đường Mới" });
    expect(res.status).toBe(200);
  });

  it("role KHÔNG có site_content.manage → 403", async () => {
    const memberCookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .patch("/api/v1/admin/site-content/hotline")
      .set("Cookie", memberCookie)
      .send({ value: "0911 111 111" });
    expect(res.status).toBe(403);
  });

  it("chưa đăng nhập → 401", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/site-content/hotline")
      .send({ value: "0911 111 111" });
    expect(res.status).toBe(401);
  });
});

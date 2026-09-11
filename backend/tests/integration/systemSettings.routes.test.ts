import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";

describe("SuperAdmin — /api/v1/superadmin/settings", () => {
  let superAdminCookie: string[];

  beforeEach(() => {
    resetPrismaMock();
    superAdminCookie = loginAs("superadmin-1", ["super_admin"], ["settings.manage"]);
    db.auditLog.create.mockResolvedValue({});
  });

  it("GET liệt kê danh sách cấu hình", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "site_name", value: JSON.stringify("Hoa Xinh"), updatedAt: new Date() },
    ]);
    const res = await request(app)
      .get("/api/v1/superadmin/settings")
      .set("Cookie", superAdminCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      { key: "site_name", value: "Hoa Xinh", updatedAt: expect.any(String) },
    ]);
  });

  it("PATCH site_name hợp lệ → 200, giá trị đã lưu đúng string", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "site_name",
      value: JSON.stringify("Cửa hàng hoa mới"),
      updatedAt: new Date(),
    });
    const res = await request(app)
      .patch("/api/v1/superadmin/settings/site_name")
      .set("Cookie", superAdminCookie)
      .send({ value: "Cửa hàng hoa mới" });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe("Cửa hàng hoa mới");
  });

  it("PATCH registration_enabled gửi giá trị SAI KIỂU (string thay vì boolean) → 422", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/settings/registration_enabled")
      .set("Cookie", superAdminCookie)
      .send({ value: "true" });
    expect(res.status).toBe(422);
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("PATCH key không nằm trong danh sách hợp lệ → 422 (params z.enum chặn ở validate())", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/settings/khong-ton-tai")
      .set("Cookie", superAdminCookie)
      .send({ value: "x" });
    expect(res.status).toBe(422);
  });

  it("member KHÔNG có settings.manage → 403", async () => {
    const memberCookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .get("/api/v1/superadmin/settings")
      .set("Cookie", memberCookie);
    expect(res.status).toBe(403);
  });

  it("chưa đăng nhập → 401", async () => {
    const res = await request(app).get("/api/v1/superadmin/settings");
    expect(res.status).toBe(401);
  });
});

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs, SUPER_ADMIN_PERMISSIONS } from "./helpers";
import { emailService } from "@/modules/core/email/email.service";

const SA_ID = "superadmin-1";
let cookie: string[];

beforeEach(() => {
  resetPrismaMock();
  cookie = loginAs(SA_ID, ["super_admin"], SUPER_ADMIN_PERMISSIONS);
  db.auditLog.create.mockResolvedValue({});
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "m" });
});

describe("GET /api/v1/superadmin/users", () => {
  it("trả envelope phân trang chuẩn", async () => {
    db.user.findMany.mockResolvedValue([
      { id: "u1", fullName: "A", email: "a@x.com", status: "active", roles: [] },
    ]);
    db.user.count.mockResolvedValue(1);

    const res = await request(app).get("/api/v1/superadmin/users").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Success",
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("coerce page/limit từ query string thành số", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await request(app).get("/api/v1/superadmin/users?page=3&limit=50").set("Cookie", cookie);
    expect(db.user.findMany.mock.calls[0]![0]).toMatchObject({ skip: 100, take: 50 });
  });

  it("422 khi limit vượt mức cho phép (chống truy vấn tốn tài nguyên)", async () => {
    const res = await request(app).get("/api/v1/superadmin/users?limit=5000").set("Cookie", cookie);
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("limit");
  });

  it("422 khi status không thuộc tập cho phép", async () => {
    const res = await request(app)
      .get("/api/v1/superadmin/users?status=lung-tung")
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });
});

describe("Ràng buộc chống tự thao tác lên chính mình", () => {
  it.each([
    ["PATCH", `/api/v1/superadmin/users/${SA_ID}/block`],
    ["PATCH", `/api/v1/superadmin/users/${SA_ID}/unblock`],
    ["DELETE", `/api/v1/superadmin/users/${SA_ID}`],
  ])("%s %s → 400 CANNOT_TARGET_SELF", async (method, path) => {
    const saCookie = loginAs(
      "11111111-1111-1111-1111-111111111111",
      ["super_admin"],
      SUPER_ADMIN_PERMISSIONS,
    );
    const selfPath = path.replace(SA_ID, "11111111-1111-1111-1111-111111111111");
    const res = await request(app)
      [method.toLowerCase() as "patch" | "delete"](selfPath)
      .set("Cookie", saCookie);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("CANNOT_TARGET_SELF");
  });

  it("tự đổi role của chính mình → 400 CANNOT_TARGET_SELF", async () => {
    const selfId = "11111111-1111-1111-1111-111111111111";
    const saCookie = loginAs(selfId, ["super_admin"], SUPER_ADMIN_PERMISSIONS);
    const res = await request(app)
      .patch(`/api/v1/superadmin/users/${selfId}/role`)
      .set("Cookie", saCookie)
      .send({ roleCode: "member" });
    expect(res.body.code).toBe("CANNOT_TARGET_SELF");
  });

  it("gán super_admin cho người khác → 403 CANNOT_GRANT_SUPER_ADMIN", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/users/22222222-2222-2222-2222-222222222222/role")
      .set("Cookie", cookie)
      .send({ roleCode: "super_admin" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CANNOT_GRANT_SUPER_ADMIN");
  });

  it("422 khi :id không phải UUID (chặn payload rác trước khi vào service)", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/users/khong-phai-uuid/block")
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });
});

describe("POST /api/v1/superadmin/roles — chốt chặn shadow super_admin", () => {
  it("permission is_restricted gửi kèm trong payload bị LỌC BỎ ở service", async () => {
    // Client cố tình gửi id 90 (users.manage). DB chỉ trả về permission isRestricted=false.
    db.permission.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    db.role.create.mockResolvedValue({ id: 10, code: "accountant" });

    const res = await request(app)
      .post("/api/v1/superadmin/roles")
      .set("Cookie", cookie)
      .send({ code: "accountant", name: "Kế toán", permissionIds: [1, 2, 90] });

    expect(res.status).toBe(201);
    expect(db.permission.findMany.mock.calls[0]![0].where).toMatchObject({ isRestricted: false });
    const granted = db.role.create.mock.calls[0]![0].data.permissions.create as {
      permissionId: number;
    }[];
    expect(granted.map((p) => p.permissionId)).toEqual([1, 2]);
  });

  it("422 khi code sai định dạng", async () => {
    const res = await request(app)
      .post("/api/v1/superadmin/roles")
      .set("Cookie", cookie)
      .send({ code: "Ke Toan!", name: "Kế toán" });
    expect(res.status).toBe(422);
    expect(res.body.errors.code).toBe("Code chỉ gồm chữ thường, số, gạch dưới");
  });

  it("PATCH System Role → 403 SYSTEM_ROLE_LOCKED", async () => {
    db.role.findUnique.mockResolvedValue({ id: 1, code: "super_admin", isSystem: true });
    const res = await request(app)
      .patch("/api/v1/superadmin/roles/1")
      .set("Cookie", cookie)
      .send({ name: "Đổi tên" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SYSTEM_ROLE_LOCKED");
  });

  it("DELETE role còn người dùng → 409 ROLE_IN_USE", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false, _count: { users: 5 } });
    const res = await request(app).delete("/api/v1/superadmin/roles/10").set("Cookie", cookie);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ROLE_IN_USE");
  });
});

describe("Permissions", () => {
  it("?assignable=true loại permission is_restricted khỏi danh sách tick chọn", async () => {
    db.permission.findMany.mockResolvedValue([]);
    await request(app).get("/api/v1/superadmin/permissions?assignable=true").set("Cookie", cookie);
    expect(db.permission.findMany.mock.calls[0]![0].where).toEqual({ isRestricted: false });
  });

  it("422 khi code không đúng dạng group.action", async () => {
    const res = await request(app)
      .post("/api/v1/superadmin/permissions")
      .set("Cookie", cookie)
      .send({ code: "khong-co-dau-cham", groupName: "x" });
    expect(res.status).toBe(422);
  });

  it("đổi code của permission hệ thống → 403", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, code: "users.manage", isSystem: true });
    const res = await request(app)
      .patch("/api/v1/superadmin/permissions/1")
      .set("Cookie", cookie)
      .send({ code: "users.manage_v2" });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("SYSTEM_PERMISSION_LOCKED");
  });
});

describe("Login methods", () => {
  it("tắt phương thức cuối cùng → 400, hệ thống không bị khoá cứng", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue([
      { method: "email_password", isEnabled: true },
      { method: "google_oauth", isEnabled: false },
      { method: "magic_link", isEnabled: false },
    ]);

    const res = await request(app)
      .patch("/api/v1/superadmin/login-methods/email_password")
      .set("Cookie", cookie)
      .send({ isEnabled: false });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("AT_LEAST_ONE_LOGIN_METHOD_REQUIRED");
    expect(db.loginMethodSetting.update).not.toHaveBeenCalled();
  });

  it("422 khi method không thuộc 3 phương thức hợp lệ", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/login-methods/facebook")
      .set("Cookie", cookie)
      .send({ isEnabled: true });
    expect(res.status).toBe(422);
  });

  it("422 khi isEnabled không phải boolean", async () => {
    const res = await request(app)
      .patch("/api/v1/superadmin/login-methods/magic_link")
      .set("Cookie", cookie)
      .send({ isEnabled: "co" });
    expect(res.status).toBe(422);
  });
});

describe("Audit logs", () => {
  it("lọc theo khoảng thời gian ISO", async () => {
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    await request(app)
      .get("/api/v1/superadmin/audit-logs?from=2026-09-01T00:00:00.000Z&entityType=user")
      .set("Cookie", cookie);
    expect(db.auditLog.findMany.mock.calls[0]![0].where).toMatchObject({ entityType: "user" });
  });

  it("422 khi from không đúng định dạng datetime", async () => {
    const res = await request(app)
      .get("/api/v1/superadmin/audit-logs?from=hom-qua")
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });
});

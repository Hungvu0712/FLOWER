import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs, SUPER_ADMIN_PERMISSIONS } from "./helpers";

// Mọi endpoint quản trị phải chặn đúng 3 tầng: chưa đăng nhập (401) → thiếu permission (403) →
// đủ quyền mới chạm tới controller. Xem docs/05-database-va-rbac.md §2.5.
const PROTECTED = [
  { method: "get" as const, path: "/api/v1/superadmin/users", permission: "users.manage" },
  { method: "get" as const, path: "/api/v1/superadmin/roles", permission: "roles.manage" },
  { method: "get" as const, path: "/api/v1/superadmin/permissions", permission: "permissions.manage" },
  { method: "get" as const, path: "/api/v1/superadmin/login-methods", permission: "settings.manage" },
  { method: "get" as const, path: "/api/v1/superadmin/audit-logs", permission: "audit.view" },
  { method: "get" as const, path: "/api/v1/admin/categories", permission: "categories.manage" },
  { method: "get" as const, path: "/api/v1/admin/products", permission: "products.manage" },
  { method: "get" as const, path: "/api/v1/admin/contact-messages", permission: "contact.manage" },
  { method: "get" as const, path: "/api/v1/files", permission: "files.manage" },
  { method: "get" as const, path: "/api/v1/account/me", permission: null },
];

beforeEach(() => resetPrismaMock());

describe("Tầng 1 — chưa đăng nhập", () => {
  it.each(PROTECTED)("$method $path → 401 UNAUTHENTICATED", async ({ method, path }) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("token giả mạo (ký bằng secret khác) → 401 INVALID_TOKEN", async () => {
    const jwt = await import("jsonwebtoken");
    const forged = jwt.default.sign({ sub: "ke-tan-cong" }, "secret-gia-mao");
    const res = await request(app)
      .get("/api/v1/superadmin/users")
      .set("Cookie", [`access_token=${forged}`]);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_TOKEN");
  });
});

describe("Tầng 2 — đã đăng nhập nhưng thiếu permission", () => {
  it.each(PROTECTED.filter((p) => p.permission))(
    "member gọi $path → 403 FORBIDDEN",
    async ({ method, path }) => {
      const cookie = loginAs("member-1", ["member"], []);
      const res = await request(app)[method](path).set("Cookie", cookie);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này",
        code: "FORBIDDEN",
      });
    },
  );

  it("role super_admin nhưng KHÔNG có permission vẫn bị chặn (RBAC dựa trên permission, không dựa role)", async () => {
    const cookie = loginAs("sa-1", ["super_admin"], []); // chưa chạy seed → chưa có permission nào
    const res = await request(app).get("/api/v1/superadmin/users").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("admin KHÔNG vào được khu quản trị hệ thống, nhưng VÀO ĐƯỢC nghiệp vụ domain", async () => {
    const adminCookie = loginAs("admin-1", ["admin"], ["categories.manage", "files.manage"]);

    expect((await request(app).get("/api/v1/superadmin/users").set("Cookie", adminCookie)).status).toBe(403);

    db.category.findMany.mockResolvedValue([]);
    expect((await request(app).get("/api/v1/admin/categories").set("Cookie", adminCookie)).status).toBe(200);
  });
});

describe("Tầng 3 — đủ quyền", () => {
  it.each(PROTECTED.filter((p) => p.permission))("super_admin gọi $path → không bị 401/403", async ({ method, path }) => {
    const cookie = loginAs("sa-1", ["super_admin"], SUPER_ADMIN_PERMISSIONS);
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    db.role.findMany.mockResolvedValue([]);
    db.permission.findMany.mockResolvedValue([]);
    db.loginMethodSetting.findMany.mockResolvedValue([]);
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    db.category.findMany.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    db.contactMessage.findMany.mockResolvedValue([]);
    db.contactMessage.count.mockResolvedValue(0);
    db.file.findMany.mockResolvedValue([]);
    db.file.count.mockResolvedValue(0);

    const res = await request(app)[method](path).set("Cookie", cookie);
    expect([401, 403]).not.toContain(res.status);
  });
});

describe("Endpoint công khai — KHÔNG yêu cầu đăng nhập", () => {
  it.each([
    "/health",
    "/api/v1/auth/login-methods",
    "/api/v1/categories",
    "/api/v1/products",
  ])("%s trả 200 khi chưa đăng nhập", async (path) => {
    db.loginMethodSetting.findMany.mockResolvedValue([]);
    db.category.findMany.mockResolvedValue([]);
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    expect((await request(app).get(path)).status).toBe(200);
  });

  it("GET /api/v1/categories chỉ trả danh mục đang bật và không lộ trường nội bộ", async () => {
    db.category.findMany.mockResolvedValue([
      { id: "c1", name: "Hoa sinh nhật", slug: "hoa-sinh-nhat", description: null, parentId: null, imageFile: null },
    ]);
    const res = await request(app).get("/api/v1/categories");
    expect(res.body.data[0]).not.toHaveProperty("sortOrder");
    expect(db.category.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });
});

describe("Upload file — mở cho mọi user đã đăng nhập, quản lý cần files.manage", () => {
  it("member ĐƯỢC lấy chữ ký upload (để tự đổi avatar) — api_sign_request tính cục bộ, không gọi Cloudinary", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/files/presign")
      .set("Cookie", cookie)
      .send({ originalName: "avatar.png", mimeType: "image/png", sizeBytes: 1024 });
    expect(res.status).toBe(200);
  });

  it("member KHÔNG xem được danh sách file (cần files.manage)", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    expect((await request(app).get("/api/v1/files").set("Cookie", cookie)).status).toBe(403);
  });

  it("từ chối mime type không nằm trong danh sách cho phép", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/files/presign")
      .set("Cookie", cookie)
      .send({ originalName: "script.exe", mimeType: "application/x-msdownload", sizeBytes: 1024 });
    expect(res.status).toBe(422);
    expect(res.body.errors.mimeType).toBe("Loại file không được hỗ trợ");
  });

  it("từ chối file vượt 10MB", async () => {
    const cookie = loginAs("member-1", ["member"], []);
    const res = await request(app)
      .post("/api/v1/files/presign")
      .set("Cookie", cookie)
      .send({ originalName: "to.png", mimeType: "image/png", sizeBytes: 11 * 1024 * 1024 });
    expect(res.status).toBe(422);
    expect(res.body.errors.sizeBytes).toBe("File tối đa 10MB");
  });
});

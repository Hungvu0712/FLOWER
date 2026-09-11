import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";
import { db, loginAs } from "./helpers";
import { sha256 } from "@/shared/utils/hash";

const USER_ID = "33333333-3333-3333-3333-333333333333";
let cookie: string[];

beforeEach(() => {
  resetPrismaMock();
  cookie = loginAs(USER_ID, ["member"], []);
});

describe("GET /api/v1/account/me", () => {
  it("trả hồ sơ kèm roles/permissions hiện tại, KHÔNG kèm passwordHash", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      fullName: "Người A",
      email: "a@example.com",
      passwordHash: "$2a$12$bi-mat",
      avatarFile: null,
    });

    const res = await request(app).get("/api/v1/account/me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: USER_ID, roles: ["member"], permissions: [] });
    expect(res.body.data).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("bi-mat");
  });

  it("KHÔNG lộ failedLoginAttempts/lockedUntil — chi tiết khoá tạm nội bộ, không phải dữ liệu hồ sơ (docs/12 BE-17)", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      fullName: "Người A",
      email: "a@example.com",
      passwordHash: "$2a$12$bi-mat",
      avatarFile: null,
      failedLoginAttempts: 3,
      lockedUntil: new Date(Date.now() + 60_000),
    });

    const res = await request(app).get("/api/v1/account/me").set("Cookie", cookie);

    expect(res.body.data).not.toHaveProperty("failedLoginAttempts");
    expect(res.body.data).not.toHaveProperty("lockedUntil");
  });
});

describe("PATCH /api/v1/account/profile", () => {
  it("cập nhật họ tên", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID, fullName: "Tên mới" });
    const res = await request(app)
      .patch("/api/v1/account/profile")
      .set("Cookie", cookie)
      .send({ fullName: "Tên mới" });
    expect(res.status).toBe(200);
    expect(db.user.update.mock.calls[0]![0].where).toEqual({ id: USER_ID });
  });

  it("422 khi avatarFileId không phải UUID", async () => {
    const res = await request(app)
      .patch("/api/v1/account/profile")
      .set("Cookie", cookie)
      .send({ avatarFileId: "khong-phai-uuid" });
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveProperty("avatarFileId");
  });

  it("KHÔNG cho user tự đổi status/role qua endpoint hồ sơ (zod loại bỏ trường lạ)", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID });
    await request(app)
      .patch("/api/v1/account/profile")
      .set("Cookie", cookie)
      .send({ fullName: "A", status: "active", roles: ["super_admin"] });

    const data = db.user.update.mock.calls[0]![0].data;
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("roles");
  });
});

describe("POST /api/v1/account/change-password", () => {
  it("422 khi mật khẩu mới dưới 8 ký tự", async () => {
    const res = await request(app)
      .post("/api/v1/account/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "cu123456", newPassword: "123" });
    expect(res.status).toBe(422);
    expect(res.body.errors.newPassword).toBe("Mật khẩu tối thiểu 8 ký tự");
  });

  it("401 khi mật khẩu hiện tại sai", async () => {
    const bcrypt = (await import("bcryptjs")).default;
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      passwordHash: await bcrypt.hash("dung", 4),
    });
    const res = await request(app)
      .post("/api/v1/account/change-password")
      .set("Cookie", cookie)
      .send({ currentPassword: "sai", newPassword: "moi12345678" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CURRENT_PASSWORD");
  });
});

describe("GET /api/v1/account/sessions", () => {
  it("đánh dấu đúng phiên hiện tại dựa trên cookie refresh_token", async () => {
    db.session.findMany.mockResolvedValue([
      { id: "s1", refreshTokenHash: sha256("token-hien-tai"), deviceName: "Chrome trên macOS" },
      { id: "s2", refreshTokenHash: sha256("token-khac"), deviceName: "Safari trên iOS" },
    ]);

    const res = await request(app)
      .get("/api/v1/account/sessions")
      .set("Cookie", [...cookie, "refresh_token=token-hien-tai"]);

    expect(res.status).toBe(200);
    expect(res.body.data.find((s: { id: string }) => s.id === "s1").isCurrent).toBe(true);
    expect(res.body.data.find((s: { id: string }) => s.id === "s2").isCurrent).toBe(false);
  });

  it("KHÔNG trả refreshTokenHash ra client", async () => {
    db.session.findMany.mockResolvedValue([{ id: "s1", refreshTokenHash: sha256("t") }]);
    const res = await request(app).get("/api/v1/account/sessions").set("Cookie", cookie);
    expect(JSON.stringify(res.body)).not.toContain(sha256("t"));
  });
});

describe("DELETE /api/v1/account/sessions/:id — chống IDOR", () => {
  it("404 khi cố thu hồi session của người khác dù biết đúng id", async () => {
    const otherSessionId = "44444444-4444-4444-4444-444444444444";
    db.session.findUnique.mockResolvedValue({ id: otherSessionId, userId: "nguoi-khac" });

    const res = await request(app)
      .delete(`/api/v1/account/sessions/${otherSessionId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
    expect(db.session.update).not.toHaveBeenCalled();
  });

  it("thu hồi được session của chính mình", async () => {
    const own = "55555555-5555-5555-5555-555555555555";
    db.session.findUnique.mockResolvedValue({ id: own, userId: USER_ID });
    db.session.update.mockResolvedValue({});
    expect(
      (await request(app).delete(`/api/v1/account/sessions/${own}`).set("Cookie", cookie)).status,
    ).toBe(200);
  });
});

describe("DELETE /api/v1/account/sessions — đăng xuất thiết bị khác", () => {
  it("GIỮ LẠI phiên hiện tại", async () => {
    db.session.updateMany.mockResolvedValue({ count: 2 });
    const res = await request(app)
      .delete("/api/v1/account/sessions")
      .set("Cookie", [...cookie, "refresh_token=token-hien-tai"]);

    expect(res.status).toBe(200);
    expect(db.session.updateMany.mock.calls[0]![0].where).toMatchObject({
      userId: USER_ID,
      refreshTokenHash: { not: sha256("token-hien-tai") },
    });
  });
});

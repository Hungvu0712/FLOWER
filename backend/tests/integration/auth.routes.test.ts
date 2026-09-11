import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { db, resetPrismaMock } from "../mocks/prisma.mock";
import { hashPassword, sha256 } from "@/shared/utils/hash";
import { emailService } from "@/modules/core/email/email.service";

const ACTIVE_USER = {
  id: "user-1",
  email: "a@example.com",
  fullName: "Người A",
  passwordHash: null as string | null,
  status: "active",
  deletedAt: null,
};

beforeEach(() => {
  resetPrismaMock();
  db.loginMethodSetting.findUnique.mockResolvedValue({ isEnabled: true });
  db.auditLog.create.mockResolvedValue({});
  db.session.create.mockResolvedValue({});
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "m" });
});

function setCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}
function cookieNames(res: request.Response): string[] {
  return setCookies(res).map((c) => c.split("=")[0]!);
}
function cookieString(res: request.Response, name: string): string {
  return setCookies(res).find((c) => c.startsWith(`${name}=`))!;
}

describe("GET /api/v1/auth/login-methods", () => {
  it("công khai — không cần đăng nhập", async () => {
    db.loginMethodSetting.findMany.mockResolvedValue([
      { method: "email_password", isEnabled: true },
      { method: "google_oauth", isEnabled: false },
    ]);
    const res = await request(app).get("/api/v1/auth/login-methods");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe("POST /api/v1/auth/register", () => {
  it("422 kèm lỗi theo field khi input sai", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ fullName: "", email: "khong-phai-email", password: "123" });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Validation failed");
    expect(res.body.errors).toEqual({
      fullName: "Vui lòng nhập họ tên",
      email: "Email không hợp lệ",
      password: "Mật khẩu tối thiểu 8 ký tự",
    });
  });

  it("KHÔNG set cookie — đăng ký xong phải tự đăng nhập lại", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue({ id: 3, code: "member" });
    db.user.create.mockResolvedValue(ACTIVE_USER);

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ fullName: "Người A", email: "a@example.com", password: "matkhau123" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("409 khi email trùng", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ fullName: "A", email: "a@example.com", password: "matkhau123" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: "Email đã được sử dụng",
      code: "EMAIL_TAKEN",
    });
  });
});

describe("POST /api/v1/auth/login", () => {
  it("đặt cả access_token và refresh_token dạng httpOnly", async () => {
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("matkhau123"),
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "a@example.com",
      password: "matkhau123",
    });

    expect(res.status).toBe(200);
    expect(cookieNames(res).sort()).toEqual(["access_token", "refresh_token"]);
    for (const c of setCookies(res)) {
      expect(c).toContain("HttpOnly");
    }
  });

  it("refresh_token dùng Path=/api/v1 để /account/sessions đọc được", async () => {
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("matkhau123"),
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "a@example.com",
      password: "matkhau123",
    });
    expect(cookieString(res, "refresh_token")).toContain("Path=/api/v1");
    expect(cookieString(res, "access_token")).toContain("Path=/");
  });

  it("401 khi sai mật khẩu, KHÔNG set cookie", async () => {
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("dung"),
    });
    db.user.update.mockResolvedValue({ failedLoginAttempts: 1 }); // docs/12 BE-17
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "a@example.com", password: "sai" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("403 khi super_admin đã tắt đăng nhập bằng email/mật khẩu", async () => {
    db.loginMethodSetting.findUnique.mockResolvedValue({ isEnabled: false });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "a@example.com",
      password: "matkhau123",
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("LOGIN_METHOD_DISABLED");
  });

  it("429 ACCOUNT_TEMPORARILY_LOCKED khi tài khoản đang trong thời gian khoá tạm (docs/12 BE-17)", async () => {
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("matkhau123"),
      lockedUntil: new Date(Date.now() + 5 * 60_000),
    });
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "a@example.com",
      password: "matkhau123", // kể cả đúng mật khẩu vẫn bị chặn trong lúc khoá
    });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("ACCOUNT_TEMPORARILY_LOCKED");
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("POST /api/v1/auth/magic-link/request", () => {
  it("email KHÔNG tồn tại vẫn trả 200 với đúng thông điệp — không lộ tài khoản nào có thật", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post("/api/v1/auth/magic-link/request")
      .send({ email: "khong-co@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Nếu email tồn tại, liên kết đăng nhập đã được gửi.");
  });

  it("email TỒN TẠI trả response giống hệt nhánh trên", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.magicLinkToken.create.mockResolvedValue({});
    const res = await request(app)
      .post("/api/v1/auth/magic-link/request")
      .send({ email: "a@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Nếu email tồn tại, liên kết đăng nhập đã được gửi.");
  });

  it("SMTP lỗi vẫn trả 200 — nếu trả 500 thì kẻ tấn công phân biệt được email nào có thật", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.magicLinkToken.create.mockResolvedValue({});
    vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));

    const res = await request(app)
      .post("/api/v1/auth/magic-link/request")
      .send({ email: "a@example.com" });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/v1/auth/magic-link/verify", () => {
  it("token hợp lệ → đăng nhập, đặt cookie", async () => {
    db.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      email: "a@example.com",
      userId: "user-1",
    });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const res = await request(app).post("/api/v1/auth/magic-link/verify").send({ token: "abc" });
    expect(res.status).toBe(200);
    expect(cookieNames(res).sort()).toEqual(["access_token", "refresh_token"]);
  });

  it("token đã dùng → 401", async () => {
    db.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });
    const res = await request(app).post("/api/v1/auth/magic-link/verify").send({ token: "abc" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_MAGIC_LINK");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("thiếu cookie → 401", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("token hợp lệ → xoay vòng, cookie mới KHÁC cookie cũ", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.session.update.mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["refresh_token=cu-abc"]);

    expect(res.status).toBe(200);
    expect(db.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sess-1" }, data: { revokedAt: expect.any(Date) } }),
    );
    expect(cookieString(res, "refresh_token")).not.toContain("cu-abc");
  });

  it("tra session bằng HASH của cookie, không bằng giá trị thô", async () => {
    db.session.findUnique.mockResolvedValue(null);
    await request(app).post("/api/v1/auth/refresh").set("Cookie", ["refresh_token=cu-abc"]);
    expect(db.session.findUnique).toHaveBeenCalledWith({
      where: { refreshTokenHash: sha256("cu-abc") },
    });
  });

  it("token ĐÃ BỊ THU HỒI được gửi lại → 401 SESSION_EXPIRED (không tiết lộ đã bị phát hiện) + thu hồi toàn bộ session (docs/12 BE-03)", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.session.updateMany.mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["refresh_token=token-cu"]);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("SESSION_EXPIRED");
    expect(db.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-1" }) }),
    );
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("xoá cookie bằng đúng Path đã set (Path lệch thì trình duyệt không xoá được)", async () => {
    db.session.findFirst.mockResolvedValue({ id: "sess-1" });
    db.session.update.mockResolvedValue({});

    const res = await request(app).post("/api/v1/auth/logout").set("Cookie", ["refresh_token=abc"]);

    expect(res.status).toBe(200);
    expect(cookieString(res, "access_token")).toContain("Path=/");
    expect(cookieString(res, "refresh_token")).toContain("Path=/api/v1");
  });

  it("không có cookie vẫn trả 200 — đăng xuất phải luôn thành công", async () => {
    expect((await request(app).post("/api/v1/auth/logout")).status).toBe(200);
  });
});

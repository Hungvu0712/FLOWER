import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { AppError } from "@/shared/errors";
import { hashPassword, sha256 } from "@/shared/utils/hash";
import { emailService } from "@/modules/core/email/email.service";
import * as authService from "@/modules/core/auth/auth.service";


const MEMBER_ROLE = { id: 3, code: "member" };
const ACTIVE_USER = {
  id: "user-1",
  email: "a@example.com",
  fullName: "Người A",
  passwordHash: null as string | null,
  status: "active",
  deletedAt: null as Date | null,
};

function enableAllLoginMethods() {
  db.loginMethodSetting.findUnique.mockResolvedValue({ method: "any", isEnabled: true });
}

beforeEach(() => {
  resetPrismaMock();
  enableAllLoginMethods();
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "msg-1" });
});

describe("register", () => {
  it("tạo user mới kèm role member và KHÔNG trả về passwordHash", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue(MEMBER_ROLE);
    db.user.create.mockResolvedValue({ ...ACTIVE_USER, passwordHash: "hashed" });

    const user = await authService.register({
      fullName: "Người A",
      email: "a@example.com",
      password: "matkhau123",
    });

    expect(user).not.toHaveProperty("passwordHash");
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roles: { create: { roleId: MEMBER_ROLE.id } } }),
      }),
    );
  });

  it("lưu mật khẩu dạng hash, không lưu bản rõ", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue(MEMBER_ROLE);
    db.user.create.mockResolvedValue(ACTIVE_USER);

    await authService.register({ fullName: "A", email: "a@example.com", password: "matkhau123" });

    const stored = db.user.create.mock.calls[0]![0].data.passwordHash as string;
    expect(stored).not.toBe("matkhau123");
    expect(stored).toMatch(/^\$2[aby]\$12\$/);
  });

  it("409 EMAIL_TAKEN khi email đã tồn tại", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    await expect(
      authService.register({ fullName: "A", email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "EMAIL_TAKEN" });
  });

  it("403 LOGIN_METHOD_DISABLED khi super_admin đã tắt đăng nhập email/mật khẩu", async () => {
    db.loginMethodSetting.findUnique.mockResolvedValue({ method: "email_password", isEnabled: false });
    await expect(
      authService.register({ fullName: "A", email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 403, code: "LOGIN_METHOD_DISABLED" });
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("loginWithPassword", () => {
  it("đăng nhập thành công với mật khẩu đúng", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, passwordHash: await hashPassword("matkhau123") });
    const user = await authService.loginWithPassword({ email: "a@example.com", password: "matkhau123" });
    expect(user.id).toBe("user-1");
  });

  it("sai email và sai mật khẩu trả CÙNG thông điệp — không lộ email nào có tài khoản", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const errNoUser = (await authService
      .loginWithPassword({ email: "khong-ton-tai@example.com", password: "x" })
      .catch((e: unknown) => e)) as AppError;

    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, passwordHash: await hashPassword("dung") });
    const errWrongPass = (await authService
      .loginWithPassword({ email: "a@example.com", password: "sai" })
      .catch((e: unknown) => e)) as AppError;

    expect(errNoUser.message).toBe(errWrongPass.message);
    expect(errNoUser.code).toBe("INVALID_CREDENTIALS");
    expect(errWrongPass.code).toBe("INVALID_CREDENTIALS");
  });

  it("403 ACCOUNT_BLOCKED khi tài khoản bị khoá", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: "blocked", passwordHash: "x" });
    await expect(
      authService.loginWithPassword({ email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 403, code: "ACCOUNT_BLOCKED" });
  });

  it("tài khoản đã xoá mềm bị từ chối như tài khoản không tồn tại", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, deletedAt: new Date(), passwordHash: "x" });
    await expect(
      authService.loginWithPassword({ email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("tài khoản chỉ đăng nhập Google/magic link (passwordHash = null) không đăng nhập được bằng mật khẩu", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, passwordHash: null });
    await expect(
      authService.loginWithPassword({ email: "a@example.com", password: "batky" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe("issueSession", () => {
  it("lưu HASH của refresh token vào DB, không lưu token thô", async () => {
    db.session.create.mockResolvedValue({});
    const session = await authService.issueSession(ACTIVE_USER as never, {
      userAgent: "UA",
      deviceName: "Chrome trên macOS",
      ipAddress: "1.2.3.4",
    });

    const stored = db.session.create.mock.calls[0]![0].data;
    expect(stored.refreshTokenHash).toBe(sha256(session.refreshToken));
    expect(stored.refreshTokenHash).not.toBe(session.refreshToken);
    expect(JSON.stringify(stored)).not.toContain(session.refreshToken);
  });

  it("lưu kèm thông tin thiết bị để phục vụ màn quản lý thiết bị", async () => {
    db.session.create.mockResolvedValue({});
    await authService.issueSession(ACTIVE_USER as never, {
      userAgent: "UA",
      deviceName: "Chrome trên macOS",
      ipAddress: "1.2.3.4",
    });
    expect(db.session.create.mock.calls[0]![0].data).toMatchObject({
      deviceName: "Chrome trên macOS",
      ipAddress: "1.2.3.4",
      userAgent: "UA",
    });
  });

  it("access token chỉ chứa sub, không chứa role/permission", async () => {
    db.session.create.mockResolvedValue({});
    const session = await authService.issueSession(ACTIVE_USER as never);
    const payload = JSON.parse(Buffer.from(session.accessToken.split(".")[1]!, "base64url").toString());
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("không trả passwordHash trong session", async () => {
    db.session.create.mockResolvedValue({});
    const session = await authService.issueSession({ ...ACTIVE_USER, passwordHash: "bi-mat" } as never);
    expect(session.user).not.toHaveProperty("passwordHash");
  });
});

describe("requestMagicLink", () => {
  it("lưu hash token và gửi email chứa link khi email tồn tại", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.magicLinkToken.create.mockResolvedValue({});

    await authService.requestMagicLink({ email: "a@example.com" });

    const stored = db.magicLinkToken.create.mock.calls[0]![0].data;
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const html = (emailService.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0].html as string;
    const tokenInEmail = /token=([0-9a-f]+)/.exec(html)![1]!;
    expect(sha256(tokenInEmail)).toBe(stored.tokenHash);
  });

  it("email không tồn tại → im lặng thành công, KHÔNG tạo token, KHÔNG gửi email", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(authService.requestMagicLink({ email: "khong-co@example.com" })).resolves.toBeUndefined();
    expect(db.magicLinkToken.create).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("tài khoản bị khoá → không gửi magic link", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: "blocked" });
    await authService.requestMagicLink({ email: "a@example.com" });
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it("lỗi gửi email KHÔNG được văng ra ngoài — nếu không, response sẽ khác nhánh 'email không tồn tại' và làm lộ email", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.magicLinkToken.create.mockResolvedValue({});
    vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));
    await expect(authService.requestMagicLink({ email: "a@example.com" })).resolves.toBeUndefined();
  });
});

describe("verifyMagicLink", () => {
  const token = "a".repeat(64);

  it("đánh dấu token đã dùng và trả về user", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      email: "a@example.com",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.magicLinkToken.update.mockResolvedValue({});
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const user = await authService.verifyMagicLink(token);

    expect(user.id).toBe("user-1");
    expect(db.magicLinkToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ml-1" }, data: { usedAt: expect.any(Date) } }),
    );
  });

  it("tra cứu bằng HASH của token, không bằng token thô", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue(null);
    await authService.verifyMagicLink(token).catch(() => {});
    expect(db.magicLinkToken.findUnique).toHaveBeenCalledWith({ where: { tokenHash: sha256(token) } });
  });

  it("từ chối token đã dùng (dùng 1 lần)", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({ code: "INVALID_MAGIC_LINK" });
  });

  it("từ chối token đã hết hạn", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({ code: "INVALID_MAGIC_LINK" });
  });

  it("từ chối token không tồn tại", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue(null);
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({ code: "INVALID_MAGIC_LINK" });
  });

  it("email chưa có tài khoản → tạo tài khoản mới, email coi như đã xác thực", async () => {
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      email: "moi@example.com",
      userId: null,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.magicLinkToken.update.mockResolvedValue({});
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue(MEMBER_ROLE);
    db.user.create.mockResolvedValue({ ...ACTIVE_USER, email: "moi@example.com" });

    await authService.verifyMagicLink(token);

    expect(db.user.create.mock.calls[0]![0].data).toMatchObject({
      email: "moi@example.com",
      fullName: "moi",
      passwordHash: null,
      emailVerifiedAt: expect.any(Date),
    });
  });
});

describe("refreshSession — rotation", () => {
  it("thu hồi refresh token cũ rồi phát hành cặp mới", async () => {
    db.session.findFirst.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.session.update.mockResolvedValue({});
    db.session.create.mockResolvedValue({});

    const session = await authService.refreshSession("refresh-cu");

    expect(db.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sess-1" }, data: { revokedAt: expect.any(Date) } }),
    );
    expect(db.session.create).toHaveBeenCalled();
    expect(session.refreshToken).not.toBe("refresh-cu");
  });

  it("chỉ chấp nhận session chưa bị thu hồi", async () => {
    db.session.findFirst.mockResolvedValue(null);
    await authService.refreshSession("refresh-cu").catch(() => {});
    expect(db.session.findFirst).toHaveBeenCalledWith({
      where: { refreshTokenHash: sha256("refresh-cu"), revokedAt: null },
    });
  });

  it("401 UNAUTHENTICATED khi thiếu refresh token", async () => {
    await expect(authService.refreshSession(undefined)).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("401 SESSION_EXPIRED khi session hết hạn", async () => {
    db.session.findFirst.mockResolvedValue({ id: "s", userId: "u", expiresAt: new Date(Date.now() - 1000) });
    await expect(authService.refreshSession("t")).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
  });

  it("user bị khoá giữa chừng → refresh thất bại (không gia hạn phiên cho tài khoản đã block)", async () => {
    db.session.findFirst.mockResolvedValue({ id: "s", userId: "u", expiresAt: new Date(Date.now() + 60_000) });
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: "blocked" });
    await expect(authService.refreshSession("t")).rejects.toMatchObject({ code: "ACCOUNT_BLOCKED" });
  });
});

describe("logout", () => {
  it("thu hồi session tương ứng với refresh token", async () => {
    db.session.findFirst.mockResolvedValue({ id: "sess-1" });
    db.session.update.mockResolvedValue({});
    await authService.logout("refresh-abc");
    expect(db.session.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sess-1" }, data: { revokedAt: expect.any(Date) } }),
    );
  });

  it("không có cookie → không lỗi, không đụng DB (đăng xuất phải luôn thành công)", async () => {
    await expect(authService.logout(undefined)).resolves.toBeUndefined();
    expect(db.session.findFirst).not.toHaveBeenCalled();
  });

  it("token không khớp session nào → im lặng bỏ qua", async () => {
    db.session.findFirst.mockResolvedValue(null);
    await expect(authService.logout("khong-ton-tai")).resolves.toBeUndefined();
    expect(db.session.update).not.toHaveBeenCalled();
  });
});

describe("forgotPassword / resetPassword", () => {
  it("email không tồn tại → im lặng thành công, không tạo token", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(authService.forgotPassword({ email: "x@example.com" })).resolves.toBeUndefined();
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("lỗi gửi email không văng ra ngoài (giữ response giống nhánh email không tồn tại)", async () => {
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);
    db.passwordResetToken.create.mockResolvedValue({});
    vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));
    await expect(authService.forgotPassword({ email: "a@example.com" })).resolves.toBeUndefined();
  });

  it("đặt lại mật khẩu thành công: đánh dấu token đã dùng + ghi hash mới", async () => {
    db.passwordResetToken.findUnique.mockResolvedValue({
      id: "pr-1",
      userId: "user-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.passwordResetToken.update.mockResolvedValue({});
    db.user.update.mockResolvedValue({});

    await authService.resetPassword({ token: "t".repeat(64), newPassword: "matkhaumoi123" });

    expect(db.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pr-1" }, data: { usedAt: expect.any(Date) } }),
    );
    const newHash = db.user.update.mock.calls[0]![0].data.passwordHash as string;
    expect(newHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("từ chối reset token đã dùng / hết hạn / không tồn tại", async () => {
    for (const record of [
      null,
      { id: "x", usedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
      { id: "x", usedAt: null, expiresAt: new Date(Date.now() - 1000) },
    ]) {
      db.passwordResetToken.findUnique.mockResolvedValue(record);
      await expect(
        authService.resetPassword({ token: "t", newPassword: "matkhaumoi123" }),
      ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    }
  });
});

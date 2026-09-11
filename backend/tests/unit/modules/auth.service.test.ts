import { beforeEach, describe, expect, it, vi } from "vitest";
import { OAuth2Client } from "google-auth-library";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { AppError } from "@/shared/errors";
import { hashPassword, sha256 } from "@/shared/utils/hash";
import { emailService } from "@/modules/core/email/email.service";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as authService from "@/modules/core/auth/auth.service";

// auth.service.ts tạo `googleClient = new OAuth2Client(...)` MỘT LẦN lúc module load — spy thẳng vào
// prototype để áp dụng cho instance singleton đó, không cách nào inject mock qua constructor được.
function mockGooglePayload(payload: Record<string, unknown> | null) {
  vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
    getPayload: () => payload,
  } as never);
}

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
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
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
    db.loginMethodSetting.findUnique.mockResolvedValue({
      method: "email_password",
      isEnabled: false,
    });
    await expect(
      authService.register({ fullName: "A", email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 403, code: "LOGIN_METHOD_DISABLED" });
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe("loginWithPassword", () => {
  it("đăng nhập thành công với mật khẩu đúng", async () => {
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("matkhau123"),
    });
    const user = await authService.loginWithPassword({
      email: "a@example.com",
      password: "matkhau123",
    });
    expect(user.id).toBe("user-1");
  });

  it("sai email và sai mật khẩu trả CÙNG thông điệp — không lộ email nào có tài khoản", async () => {
    db.user.findUnique.mockResolvedValue(null);
    const errNoUser = (await authService
      .loginWithPassword({ email: "khong-ton-tai@example.com", password: "x" })
      .catch((e: unknown) => e)) as AppError;

    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      passwordHash: await hashPassword("dung"),
    });
    db.user.update.mockResolvedValue({ failedLoginAttempts: 1 });
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
    db.user.findUnique.mockResolvedValue({
      ...ACTIVE_USER,
      deletedAt: new Date(),
      passwordHash: "x",
    });
    await expect(
      authService.loginWithPassword({ email: "a@example.com", password: "matkhau123" }),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CREDENTIALS" });
  });

  it("tài khoản chỉ đăng nhập Google/magic link (passwordHash = null) không đăng nhập được bằng mật khẩu", async () => {
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, passwordHash: null });
    db.user.update.mockResolvedValue({ failedLoginAttempts: 1 });
    await expect(
      authService.loginWithPassword({ email: "a@example.com", password: "batky" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  describe("khoá tạm sau nhiều lần sai liên tiếp (docs/12 BE-17)", () => {
    it("mỗi lần sai mật khẩu đều tăng failedLoginAttempts thêm 1", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
      });
      db.user.update.mockResolvedValue({ failedLoginAttempts: 3 });

      await authService
        .loginWithPassword({ email: "a@example.com", password: "sai" })
        .catch(() => {});

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
      });
    });

    it("chạm ngưỡng 5 lần sai → khoá tài khoản, đặt lockedUntil trong tương lai", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
      });
      db.user.update.mockResolvedValueOnce({ failedLoginAttempts: 5 }).mockResolvedValueOnce({});

      await authService
        .loginWithPassword({ email: "a@example.com", password: "sai" })
        .catch(() => {});

      const lockCall = db.user.update.mock.calls[1]![0];
      expect(lockCall.where).toEqual({ id: "user-1" });
      expect(lockCall.data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it("chưa chạm ngưỡng (vd lần sai thứ 3) → KHÔNG khoá, chỉ tăng bộ đếm", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
      });
      db.user.update.mockResolvedValue({ failedLoginAttempts: 3 });

      await authService
        .loginWithPassword({ email: "a@example.com", password: "sai" })
        .catch(() => {});

      expect(db.user.update).toHaveBeenCalledTimes(1); // chỉ có lệnh tăng đếm, không có lệnh khoá
    });

    it("429 ACCOUNT_TEMPORARILY_LOCKED khi đang trong thời gian khoá — KHÔNG verify mật khẩu (không tốn bcrypt, không cho dò tiếp)", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
        lockedUntil: new Date(Date.now() + 5 * 60_000),
      });

      await expect(
        authService.loginWithPassword({ email: "a@example.com", password: "dung" }),
      ).rejects.toMatchObject({ statusCode: 429, code: "ACCOUNT_TEMPORARILY_LOCKED" });
      expect(db.user.update).not.toHaveBeenCalled();
    });

    it("lockedUntil ĐÃ QUA (hết hạn khoá) → cho đăng nhập lại bình thường", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
        lockedUntil: new Date(Date.now() - 60_000), // đã qua 1 phút
        failedLoginAttempts: 5,
      });
      db.user.update.mockResolvedValue({});

      const user = await authService.loginWithPassword({
        email: "a@example.com",
        password: "dung",
      });
      expect(user.id).toBe("user-1");
    });

    it("đăng nhập ĐÚNG mật khẩu sau các lần sai trước đó → xoá bộ đếm và lockedUntil", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
        failedLoginAttempts: 3,
      });
      db.user.update.mockResolvedValue({});

      await authService.loginWithPassword({ email: "a@example.com", password: "dung" });

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    });

    it("đăng nhập đúng mà TRƯỚC ĐÓ chưa từng sai lần nào → không gọi reset thừa", async () => {
      db.user.findUnique.mockResolvedValue({
        ...ACTIVE_USER,
        passwordHash: await hashPassword("dung"),
      });

      await authService.loginWithPassword({ email: "a@example.com", password: "dung" });

      expect(db.user.update).not.toHaveBeenCalled();
    });
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
    const payload = JSON.parse(
      Buffer.from(session.accessToken.split(".")[1]!, "base64url").toString(),
    );
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("không trả passwordHash trong session", async () => {
    db.session.create.mockResolvedValue({});
    const session = await authService.issueSession({
      ...ACTIVE_USER,
      passwordHash: "bi-mat",
    } as never);
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
    const html = (emailService.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0]
      .html as string;
    const tokenInEmail = /token=([0-9a-f]+)/.exec(html)![1]!;
    expect(sha256(tokenInEmail)).toBe(stored.tokenHash);
  });

  it("email không tồn tại → im lặng thành công, KHÔNG tạo token, KHÔNG gửi email", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(
      authService.requestMagicLink({ email: "khong-co@example.com" }),
    ).resolves.toBeUndefined();
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

  // Kiểm tra hợp lệ + đánh dấu đã dùng NGUYÊN TỬ qua updateMany (docs/12 BE-05) — where khớp cả
  // usedAt:null lẫn expiresAt còn hạn, count 1 = thắng cuộc đua, 0 = không tồn tại/đã dùng/hết hạn.
  // Sau khi thắng, service đọc lại record qua findUnique để lấy email/userId.
  function mockConsumeSucceeds(record: { id: string; email: string; userId: string | null }) {
    db.magicLinkToken.updateMany.mockResolvedValue({ count: 1 });
    db.magicLinkToken.findUnique.mockResolvedValue(record);
  }
  function mockConsumeFails() {
    db.magicLinkToken.updateMany.mockResolvedValue({ count: 0 });
  }

  it("đánh dấu token đã dùng và trả về user", async () => {
    mockConsumeSucceeds({ id: "ml-1", email: "a@example.com", userId: "user-1" });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const user = await authService.verifyMagicLink(token);

    expect(user.id).toBe("user-1");
    expect(db.magicLinkToken.updateMany.mock.calls[0]![0]).toMatchObject({
      where: { tokenHash: sha256(token), usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("tra cứu bằng HASH của token, không bằng token thô", async () => {
    mockConsumeFails();
    await authService.verifyMagicLink(token).catch(() => {});
    expect(db.magicLinkToken.updateMany.mock.calls[0]![0].where).toMatchObject({
      tokenHash: sha256(token),
    });
  });

  it("từ chối token đã dùng (dùng 1 lần) — updateMany không khớp dòng nào vì usedAt đã khác null", async () => {
    mockConsumeFails();
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({
      code: "INVALID_MAGIC_LINK",
    });
  });

  it("từ chối token đã hết hạn — updateMany không khớp dòng nào vì expiresAt đã qua", async () => {
    mockConsumeFails();
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({
      code: "INVALID_MAGIC_LINK",
    });
  });

  it("từ chối token không tồn tại", async () => {
    mockConsumeFails();
    await expect(authService.verifyMagicLink(token)).rejects.toMatchObject({
      code: "INVALID_MAGIC_LINK",
    });
  });

  it("hai request đồng thời cùng 1 token — chỉ 1 request thắng cuộc đua (docs/12 BE-05)", async () => {
    db.magicLinkToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    db.magicLinkToken.findUnique.mockResolvedValue({
      id: "ml-1",
      email: "a@example.com",
      userId: "user-1",
    });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const [first, second] = await Promise.allSettled([
      authService.verifyMagicLink(token),
      authService.verifyMagicLink(token),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    expect((second as PromiseRejectedResult).reason).toMatchObject({ code: "INVALID_MAGIC_LINK" });
  });

  it("email chưa có tài khoản → tạo tài khoản mới, email coi như đã xác thực", async () => {
    mockConsumeSucceeds({ id: "ml-1", email: "moi@example.com", userId: null });
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

describe("loginWithGoogle", () => {
  const GOOGLE_SUB = "google-sub-1";

  it("401 GOOGLE_EMAIL_UNVERIFIED khi Google trả email CHƯA xác minh — chống chiếm tài khoản qua email giả (docs/12 BE-04)", async () => {
    mockGooglePayload({ email: "victim@example.com", email_verified: false, sub: GOOGLE_SUB });
    await expect(authService.loginWithGoogle("id-token")).rejects.toMatchObject({
      statusCode: 401,
      code: "GOOGLE_EMAIL_UNVERIFIED",
    });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("401 INVALID_GOOGLE_TOKEN khi payload không có email", async () => {
    mockGooglePayload({ email_verified: true, sub: GOOGLE_SUB });
    await expect(authService.loginWithGoogle("id-token")).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_GOOGLE_TOKEN",
    });
  });

  it("401 INVALID_GOOGLE_TOKEN khi verifyIdToken ném lỗi (token sai định dạng/hết hạn/audience không khớp)", async () => {
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockRejectedValue(new Error("invalid token"));
    await expect(authService.loginWithGoogle("id-token")).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_GOOGLE_TOKEN",
    });
  });

  it("email đã xác minh + chưa có tài khoản nào → tạo user mới và liên kết authAccount", async () => {
    mockGooglePayload({
      email: "moi@example.com",
      email_verified: true,
      sub: GOOGLE_SUB,
      name: "Người Mới",
    });
    db.authAccount.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    db.role.findUnique.mockResolvedValue(MEMBER_ROLE);
    db.user.create.mockResolvedValue({ ...ACTIVE_USER, id: "user-new", email: "moi@example.com" });
    db.authAccount.create.mockResolvedValue({});

    const user = await authService.loginWithGoogle("id-token");

    expect(user.id).toBe("user-new");
    expect(db.authAccount.create.mock.calls[0]![0].data).toMatchObject({
      userId: "user-new",
      provider: "google",
      providerAccountId: GOOGLE_SUB,
    });
  });

  it("đã từng liên kết authAccount trước đó → đăng nhập thẳng, KHÔNG tạo user/liên kết lại", async () => {
    mockGooglePayload({ email: "a@example.com", email_verified: true, sub: GOOGLE_SUB });
    db.authAccount.findUnique.mockResolvedValue({ userId: "user-1" });
    db.user.findUnique.mockResolvedValue(ACTIVE_USER);

    const user = await authService.loginWithGoogle("id-token");

    expect(user.id).toBe("user-1");
    expect(db.user.create).not.toHaveBeenCalled();
    expect(db.authAccount.create).not.toHaveBeenCalled();
  });

  it("403 LOGIN_METHOD_DISABLED khi super_admin đã tắt đăng nhập Google", async () => {
    db.loginMethodSetting.findUnique.mockResolvedValue({
      method: "google_oauth",
      isEnabled: false,
    });
    await expect(authService.loginWithGoogle("id-token")).rejects.toMatchObject({
      statusCode: 403,
      code: "LOGIN_METHOD_DISABLED",
    });
  });
});

describe("refreshSession — rotation", () => {
  it("thu hồi refresh token cũ rồi phát hành cặp mới", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      revokedAt: null,
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

  it("tra cứu session KHÔNG lọc revokedAt (cần phân biệt chưa tồn tại với đã bị thu hồi — docs/12 BE-03)", async () => {
    db.session.findUnique.mockResolvedValue(null);
    await authService.refreshSession("refresh-cu").catch(() => {});
    expect(db.session.findUnique).toHaveBeenCalledWith({
      where: { refreshTokenHash: sha256("refresh-cu") },
    });
  });

  it("401 UNAUTHENTICATED khi thiếu refresh token", async () => {
    await expect(authService.refreshSession(undefined)).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("401 SESSION_EXPIRED khi session hết hạn", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "s",
      userId: "u",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(authService.refreshSession("t")).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });

  it("user bị khoá giữa chừng → refresh thất bại (không gia hạn phiên cho tài khoản đã block)", async () => {
    db.session.findUnique.mockResolvedValue({
      id: "s",
      userId: "u",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    db.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: "blocked" });
    await expect(authService.refreshSession("t")).rejects.toMatchObject({
      code: "ACCOUNT_BLOCKED",
    });
  });

  describe("phát hiện dùng lại refresh token đã thu hồi (docs/12 BE-03)", () => {
    it("401 SESSION_EXPIRED — GIỐNG HỆT nhánh hết hạn, không tiết lộ đã bị phát hiện", async () => {
      db.session.findUnique.mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      await expect(authService.refreshSession("token-da-thu-hoi")).rejects.toMatchObject({
        statusCode: 401,
        code: "SESSION_EXPIRED",
      });
    });

    it("thu hồi TOÀN BỘ session của user (không chỉ token bị dùng lại)", async () => {
      db.session.findUnique.mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      await authService.refreshSession("token-da-thu-hoi").catch(() => {});

      expect(db.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: "user-1", revokedAt: null }),
        }),
      );
    });

    it("ghi audit log auth.refresh_reuse_detected", async () => {
      db.session.findUnique.mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      await authService
        .refreshSession("token-da-thu-hoi", { ipAddress: "1.2.3.4" } as never)
        .catch(() => {});

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-1",
          action: "auth.refresh_reuse_detected",
          entityType: "session",
          entityId: "sess-1",
          ipAddress: "1.2.3.4",
        }),
      );
    });

    it("gửi email cảnh báo cho chủ tài khoản", async () => {
      db.session.findUnique.mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);

      await authService.refreshSession("token-da-thu-hoi").catch(() => {});

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: ACTIVE_USER.email, type: "security_alert" }),
      );
    });

    it("lỗi gửi email cảnh báo KHÔNG được văng ra ngoài — vẫn trả đúng SESSION_EXPIRED", async () => {
      db.session.findUnique.mockResolvedValue({
        id: "sess-1",
        userId: "user-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      db.user.findUnique.mockResolvedValue(ACTIVE_USER);
      vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));

      await expect(authService.refreshSession("token-da-thu-hoi")).rejects.toMatchObject({
        code: "SESSION_EXPIRED",
      });
    });
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

  it("đặt lại mật khẩu thành công: đánh dấu token đã dùng NGUYÊN TỬ (BE-05) + ghi hash mới + thu hồi mọi session (BE-01)", async () => {
    db.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    db.passwordResetToken.findUnique.mockResolvedValue({ id: "pr-1", userId: "user-1" });
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({});

    await authService.resetPassword({ token: "t".repeat(64), newPassword: "matkhaumoi123" });

    expect(db.passwordResetToken.updateMany.mock.calls[0]![0]).toMatchObject({
      where: { tokenHash: sha256("t".repeat(64)), usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    const newHash = db.user.update.mock.calls[0]![0].data.passwordHash as string;
    expect(newHash).toMatch(/^\$2[aby]\$12\$/);
    // Quên mật khẩu không có "phiên hiện tại" nào để chừa — thu hồi TẤT CẢ (không truyền exceptHash).
    expect(db.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1", revokedAt: null } }),
    );
  });

  it("từ chối reset token đã dùng / hết hạn / không tồn tại — updateMany không khớp dòng nào", async () => {
    db.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      authService.resetPassword({ token: "t", newPassword: "matkhaumoi123" }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("hai request đồng thời cùng 1 token — chỉ 1 request thắng cuộc đua (docs/12 BE-05)", async () => {
    db.passwordResetToken.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    db.passwordResetToken.findUnique.mockResolvedValue({ id: "pr-1", userId: "user-1" });
    db.user.update.mockResolvedValue({});

    const [first, second] = await Promise.allSettled([
      authService.resetPassword({ token: "t".repeat(64), newPassword: "matkhaumoi123" }),
      authService.resetPassword({ token: "t".repeat(64), newPassword: "matkhaumoi123" }),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.status).toBe("rejected");
    expect((second as PromiseRejectedResult).reason).toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });
});

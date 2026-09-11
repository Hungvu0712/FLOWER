import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { hashPassword, sha256 } from "@/shared/utils/hash";
import * as filesService from "@/modules/core/files/files.service";
import * as service from "@/modules/core/users/users.service";

const USER_ID = "user-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(filesService, "setEntityFile").mockResolvedValue(undefined);
});

describe("getMe", () => {
  it("trả roles/permissions HIỆN TẠI từ DB, không phải từ token", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "a@example.com",
      passwordHash: "bi-mat",
    });
    db.userRole.findMany.mockResolvedValue([
      { role: { code: "admin", permissions: [{ permission: { code: "files.manage" } }] } },
    ]);

    const me = await service.getMe(USER_ID);

    expect(me.roles).toEqual(["admin"]);
    expect(me.permissions).toEqual(["files.manage"]);
    expect(db.userRole.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    );
  });

  it("KHÔNG BAO GIỜ trả passwordHash ra API", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "a@example.com",
      passwordHash: "$2a$12$bi-mat",
    });
    db.userRole.findMany.mockResolvedValue([]);
    const me = await service.getMe(USER_ID);
    expect(me).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(me)).not.toContain("bi-mat");
  });

  it("404 khi user không tồn tại", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.userRole.findMany.mockResolvedValue([]);
    await expect(service.getMe(USER_ID)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateProfile", () => {
  it("chỉ cập nhật trường được gửi lên (partial update)", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID });
    await service.updateProfile(USER_ID, { fullName: "Tên mới" } as never);
    expect(db.user.update.mock.calls[0]![0].data).toEqual({ fullName: "Tên mới" });
  });

  it("đặt avatar mới thì ghi file_usages để job dọn file không xoá nhầm", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID });
    await service.updateProfile(USER_ID, { avatarFileId: "file-9" } as never);
    expect(filesService.setEntityFile).toHaveBeenCalledWith({
      fileId: "file-9",
      entityType: "user_avatar",
      entityId: USER_ID,
    });
  });

  it("gỡ avatar (null) vẫn ghi được vào DB nhưng không tạo file_usages", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID });
    await service.updateProfile(USER_ID, { avatarFileId: null } as never);
    expect(db.user.update.mock.calls[0]![0].data).toEqual({ avatarFileId: null });
    expect(filesService.setEntityFile).not.toHaveBeenCalled();
  });

  it("không trả passwordHash sau khi cập nhật", async () => {
    db.user.update.mockResolvedValue({ id: USER_ID, passwordHash: "bi-mat" });
    expect(await service.updateProfile(USER_ID, { fullName: "X" } as never)).not.toHaveProperty(
      "passwordHash",
    );
  });
});

describe("changePassword", () => {
  it("đổi mật khẩu thành công khi mật khẩu hiện tại đúng", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      passwordHash: await hashPassword("cu123456"),
    });
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({});
    await service.changePassword(USER_ID, {
      currentPassword: "cu123456",
      newPassword: "moi12345678",
    } as never);
    expect(db.user.update.mock.calls[0]![0].data.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("401 khi mật khẩu hiện tại sai", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      passwordHash: await hashPassword("cu123456"),
    });
    await expect(
      service.changePassword(USER_ID, {
        currentPassword: "sai",
        newPassword: "moi12345678",
      } as never),
    ).rejects.toMatchObject({ statusCode: 401, code: "INVALID_CURRENT_PASSWORD" });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("tài khoản Google/magic link (chưa có mật khẩu) được đặt mật khẩu đầu tiên", async () => {
    db.user.findUnique.mockResolvedValue({ id: USER_ID, passwordHash: null });
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({});
    await expect(
      service.changePassword(USER_ID, { currentPassword: "", newPassword: "moi12345678" } as never),
    ).resolves.toBeUndefined();
  });

  it("thu hồi mọi session KHÁC (đuổi thiết bị khác), CHỪA LẠI phiên hiện tại (docs/12 BE-01)", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      passwordHash: await hashPassword("cu123456"),
    });
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({});

    await service.changePassword(
      USER_ID,
      { currentPassword: "cu123456", newPassword: "moi12345678" } as never,
      "token-hien-tai",
    );

    expect(db.session.updateMany.mock.calls[0]![0].where).toEqual({
      userId: USER_ID,
      revokedAt: null,
      refreshTokenHash: { not: sha256("token-hien-tai") },
    });
  });

  it("không có refresh token hiện tại (vd gọi qua API khác /account) → thu hồi TẤT CẢ session", async () => {
    db.user.findUnique.mockResolvedValue({
      id: USER_ID,
      passwordHash: await hashPassword("cu123456"),
    });
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({});

    await service.changePassword(USER_ID, {
      currentPassword: "cu123456",
      newPassword: "moi12345678",
    } as never);

    expect(db.session.updateMany.mock.calls[0]![0].where).toEqual({
      userId: USER_ID,
      revokedAt: null,
    });
  });
});

describe("listSessions", () => {
  it("đánh dấu isCurrent bằng cách so HASH của refresh token trong cookie", async () => {
    db.session.findMany.mockResolvedValue([
      { id: "s1", refreshTokenHash: sha256("token-hien-tai"), deviceName: "Chrome trên macOS" },
      { id: "s2", refreshTokenHash: sha256("token-khac"), deviceName: "Safari trên iOS" },
    ]);

    const sessions = await service.listSessions(USER_ID, "token-hien-tai");

    expect(sessions.find((s) => s.id === "s1")!.isCurrent).toBe(true);
    expect(sessions.find((s) => s.id === "s2")!.isCurrent).toBe(false);
  });

  it("KHÔNG trả refreshTokenHash ra API", async () => {
    db.session.findMany.mockResolvedValue([{ id: "s1", refreshTokenHash: sha256("t") }]);
    expect(await service.listSessions(USER_ID, "t")).toEqual([
      expect.not.objectContaining({ refreshTokenHash: expect.anything() }),
    ]);
  });

  it("chỉ lấy session chưa bị thu hồi", async () => {
    db.session.findMany.mockResolvedValue([]);
    await service.listSessions(USER_ID, undefined);
    expect(db.session.findMany.mock.calls[0]![0].where).toEqual({
      userId: USER_ID,
      revokedAt: null,
    });
  });

  it("không có cookie → không phiên nào là 'hiện tại'", async () => {
    db.session.findMany.mockResolvedValue([{ id: "s1", refreshTokenHash: sha256("t") }]);
    expect((await service.listSessions(USER_ID, undefined))[0]!.isCurrent).toBe(false);
  });
});

describe("revokeSession — chống IDOR", () => {
  it("CHẶN thu hồi session của người khác dù biết đúng session id", async () => {
    db.session.findUnique.mockResolvedValue({ id: "s-nguoi-khac", userId: "user-999" });
    await expect(service.revokeSession(USER_ID, "s-nguoi-khac")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(db.session.update).not.toHaveBeenCalled();
  });

  it("thu hồi được session của chính mình", async () => {
    db.session.findUnique.mockResolvedValue({ id: "s1", userId: USER_ID });
    db.session.update.mockResolvedValue({});
    await service.revokeSession(USER_ID, "s1");
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("404 khi session không tồn tại", async () => {
    db.session.findUnique.mockResolvedValue(null);
    await expect(service.revokeSession(USER_ID, "khong-co")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("revokeOtherSessions", () => {
  it("GIỮ LẠI phiên hiện tại (không tự đăng xuất chính mình)", async () => {
    db.session.updateMany.mockResolvedValue({ count: 2 });
    await service.revokeOtherSessions(USER_ID, "token-hien-tai");
    expect(db.session.updateMany.mock.calls[0]![0].where).toEqual({
      userId: USER_ID,
      revokedAt: null,
      refreshTokenHash: { not: sha256("token-hien-tai") },
    });
  });

  it("chỉ đụng vào session của chính user đó", async () => {
    db.session.updateMany.mockResolvedValue({ count: 0 });
    await service.revokeOtherSessions(USER_ID, "t");
    expect(db.session.updateMany.mock.calls[0]![0].where.userId).toBe(USER_ID);
  });
});

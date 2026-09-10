import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import { emailService } from "@/modules/core/email/email.service";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/users/users.admin.service";

const ACTOR = "superadmin-1";
const TARGET = "user-2";
const TARGET_USER = { id: TARGET, email: "b@example.com", status: "active", deletedAt: null as Date | null };

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  vi.spyOn(emailService, "sendEmail").mockResolvedValue({ providerMessageId: "m" });
});

describe("listUsers", () => {
  it("luôn loại trừ user đã xoá mềm", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await service.listUsers({ page: 1, limit: 20 } as never);
    expect(db.user.findMany.mock.calls[0]![0].where).toMatchObject({ deletedAt: null });
  });

  it("KHÔNG select passwordHash", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await service.listUsers({ page: 1, limit: 20 } as never);
    expect(db.user.findMany.mock.calls[0]![0].select).not.toHaveProperty("passwordHash");
  });

  it("tìm kiếm theo tên hoặc email, không phân biệt hoa thường", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await service.listUsers({ page: 1, limit: 20, search: "Nguyễn" } as never);
    expect(db.user.findMany.mock.calls[0]![0].where.OR).toEqual([
      { fullName: { contains: "Nguyễn", mode: "insensitive" } },
      { email: { contains: "Nguyễn", mode: "insensitive" } },
    ]);
  });

  it("lọc theo status và role code", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await service.listUsers({ page: 1, limit: 20, status: "blocked", role: "admin" } as never);
    const where = db.user.findMany.mock.calls[0]![0].where;
    expect(where.status).toBe("blocked");
    expect(where.roles).toEqual({ some: { role: { code: "admin" } } });
  });

  it("phân trang đúng skip/take và trả meta", async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(95);
    const { meta } = await service.listUsers({ page: 3, limit: 20 } as never);
    expect(db.user.findMany.mock.calls[0]![0]).toMatchObject({ skip: 40, take: 20 });
    expect(meta).toEqual({ page: 3, limit: 20, total: 95, totalPages: 5 });
  });
});

describe("setBlocked — chống tự khoá chính mình", () => {
  it("chặn super_admin tự khoá chính mình", async () => {
    await expect(service.setBlocked(ACTOR, ACTOR, true)).rejects.toMatchObject({
      statusCode: 400,
      code: "CANNOT_TARGET_SELF",
    });
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("chặn cả thao tác tự MỞ khoá chính mình", async () => {
    await expect(service.setBlocked(ACTOR, ACTOR, false)).rejects.toMatchObject({ code: "CANNOT_TARGET_SELF" });
  });

  it("khoá user khác thành công và ghi audit log kèm giá trị trước/sau", async () => {
    db.user.findUnique.mockResolvedValue({ status: "active" });
    db.user.update.mockResolvedValue({});
    await service.setBlocked(ACTOR, TARGET, true, "1.2.3.4");

    expect(db.user.update).toHaveBeenCalledWith({ where: { id: TARGET }, data: { status: "blocked" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR,
        action: "user.block",
        entityId: TARGET,
        before: { status: "active" },
        after: { status: "blocked" },
        ipAddress: "1.2.3.4",
      }),
    );
  });

  it("404 khi user không tồn tại", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.setBlocked(ACTOR, TARGET, true)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("softDeleteUser", () => {
  it("chặn tự xoá chính mình", async () => {
    await expect(service.softDeleteUser(ACTOR, ACTOR)).rejects.toMatchObject({ code: "CANNOT_TARGET_SELF" });
  });

  it("giải phóng email bằng hậu tố để địa chỉ đó đăng ký lại được sau này", async () => {
    db.user.findUnique.mockResolvedValue(TARGET_USER);
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({ count: 2 });

    await service.softDeleteUser(ACTOR, TARGET);

    expect(db.user.update.mock.calls[0]![0].data).toMatchObject({
      deletedAt: expect.any(Date),
      status: "blocked",
      email: `b@example.com.deleted.${TARGET}`,
    });
  });

  it("thu hồi toàn bộ session của user bị xoá (không để phiên cũ dùng tiếp)", async () => {
    db.user.findUnique.mockResolvedValue(TARGET_USER);
    db.user.update.mockResolvedValue({});
    db.session.updateMany.mockResolvedValue({ count: 2 });

    await service.softDeleteUser(ACTOR, TARGET);

    expect(db.session.updateMany).toHaveBeenCalledWith({
      where: { userId: TARGET, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("404 khi user đã bị xoá trước đó", async () => {
    db.user.findUnique.mockResolvedValue({ ...TARGET_USER, deletedAt: new Date() });
    await expect(service.softDeleteUser(ACTOR, TARGET)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("resetPassword", () => {
  it("GỬI EMAIL TRƯỚC rồi mới ghi DB — email lỗi thì mật khẩu cũ còn nguyên", async () => {
    db.user.findUnique.mockResolvedValue(TARGET_USER);
    vi.spyOn(emailService, "sendEmail").mockRejectedValue(new Error("SMTP chết"));

    await expect(service.resetPassword(ACTOR, TARGET)).rejects.toThrow("SMTP chết");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("mật khẩu bản rõ chỉ nằm trong email, KHÔNG ghi vào DB", async () => {
    db.user.findUnique.mockResolvedValue(TARGET_USER);
    db.user.update.mockResolvedValue({});

    await service.resetPassword(ACTOR, TARGET);

    const html = (emailService.sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0].html as string;
    const plain = /<strong>(.+?)<\/strong>/.exec(html)![1]!;
    const storedHash = db.user.update.mock.calls[0]![0].data.passwordHash as string;
    expect(storedHash).not.toBe(plain);
    expect(storedHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("CHO PHÉP super_admin tự reset mật khẩu của chính mình (khác block/xoá/đổi role)", async () => {
    db.user.findUnique.mockResolvedValue({ ...TARGET_USER, id: ACTOR });
    db.user.update.mockResolvedValue({});
    await expect(service.resetPassword(ACTOR, ACTOR)).resolves.toBeUndefined();
  });

  it("ghi audit log nhưng KHÔNG ghi mật khẩu vào log", async () => {
    db.user.findUnique.mockResolvedValue(TARGET_USER);
    db.user.update.mockResolvedValue({});
    await service.resetPassword(ACTOR, TARGET);

    const entry = (auditLog.record as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(entry.action).toBe("user.reset_password");
    expect(JSON.stringify(entry)).not.toMatch(/password.{0,5}:.{0,3}"[A-Za-z0-9_-]{10,}"/);
    expect(entry).not.toHaveProperty("after");
  });
});

describe("updateRole — chống leo thang quyền", () => {
  it("chặn tự đổi role của chính mình", async () => {
    await expect(service.updateRole(ACTOR, ACTOR, "admin")).rejects.toMatchObject({
      code: "CANNOT_TARGET_SELF",
    });
  });

  it("chặn gán role super_admin cho BẤT KỲ AI qua API thông thường", async () => {
    await expect(service.updateRole(ACTOR, TARGET, "super_admin")).rejects.toMatchObject({
      statusCode: 403,
      code: "CANNOT_GRANT_SUPER_ADMIN",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("kiểm tra chặn super_admin TRƯỚC khi truy vấn DB (không rò rỉ sự tồn tại của user)", async () => {
    await service.updateRole(ACTOR, TARGET, "super_admin").catch(() => {});
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("thay role bằng transaction: xoá role cũ + gán role mới (không để user 2 role lẫn lộn)", async () => {
    db.user.findUnique.mockResolvedValue({ ...TARGET_USER, roles: [{ role: { code: "member" } }] });
    db.role.findUnique.mockResolvedValue({ id: 2, code: "admin" });
    db.userRole.deleteMany.mockResolvedValue({});
    db.userRole.create.mockResolvedValue({});

    await service.updateRole(ACTOR, TARGET, "admin");

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: TARGET } });
    expect(db.userRole.create).toHaveBeenCalledWith({ data: { userId: TARGET, roleId: 2 } });
  });

  it("ghi audit log kèm role trước và sau", async () => {
    db.user.findUnique.mockResolvedValue({ ...TARGET_USER, roles: [{ role: { code: "member" } }] });
    db.role.findUnique.mockResolvedValue({ id: 2, code: "admin" });
    db.userRole.deleteMany.mockResolvedValue({});
    db.userRole.create.mockResolvedValue({});

    await service.updateRole(ACTOR, TARGET, "admin");

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "user.role_update",
        before: { roles: ["member"] },
        after: { roles: ["admin"] },
      }),
    );
  });

  it("404 ROLE_NOT_FOUND khi role code không tồn tại", async () => {
    db.user.findUnique.mockResolvedValue({ ...TARGET_USER, roles: [] });
    db.role.findUnique.mockResolvedValue(null);
    await expect(service.updateRole(ACTOR, TARGET, "khong-ton-tai")).rejects.toMatchObject({
      code: "ROLE_NOT_FOUND",
    });
  });
});

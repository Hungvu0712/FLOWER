import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/roles/roles.service";

const ACTOR = "superadmin-1";

// id 1-3 là permission thường, id 90-93 là permission is_restricted (users.manage, settings.manage,
// roles.manage, permissions.manage) — DATABASE.md §2.3.
function mockAllowedPermissions(allowedIds: number[]) {
  db.permission.findMany.mockImplementation(
    async ({ where }: { where: { id: { in: number[] } } }) =>
      where.id.in.filter((id) => allowedIds.includes(id)).map((id) => ({ id })),
  );
}

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("create — chốt chặn shadow super_admin", () => {
  it("LỌC BỎ permission is_restricted kể cả khi client cố tình gửi kèm", async () => {
    mockAllowedPermissions([1, 2]);
    db.role.create.mockResolvedValue({ id: 10, code: "accountant" });

    await service.create(ACTOR, {
      code: "accountant",
      name: "Kế toán",
      permissionIds: [1, 2, 90, 91], // 90/91 = users.manage, settings.manage
    } as never);

    const created = db.role.create.mock.calls[0]![0].data.permissions.create as {
      permissionId: number;
    }[];
    expect(created.map((p) => p.permissionId).sort()).toEqual([1, 2]);
    expect(db.permission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isRestricted: false }) }),
    );
  });

  it("role mới luôn isSystem = false (không tự nhận là System Role)", async () => {
    mockAllowedPermissions([]);
    db.role.create.mockResolvedValue({ id: 10 });
    await service.create(ACTOR, { code: "x", name: "X", permissionIds: [] } as never);
    expect(db.role.create.mock.calls[0]![0].data.isSystem).toBe(false);
  });

  it("permissionIds rỗng → không truy vấn permission thừa", async () => {
    db.role.create.mockResolvedValue({ id: 10 });
    await service.create(ACTOR, { code: "x", name: "X", permissionIds: [] } as never);
    expect(db.permission.findMany).not.toHaveBeenCalled();
  });

  it("ghi audit log role.create", async () => {
    mockAllowedPermissions([]);
    db.role.create.mockResolvedValue({ id: 10, code: "x" });
    await service.create(ACTOR, { code: "x", name: "X", permissionIds: [] } as never, "1.2.3.4");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR,
        action: "role.create",
        entityId: 10,
        ipAddress: "1.2.3.4",
      }),
    );
  });
});

describe("update", () => {
  it("chặn sửa System Role", async () => {
    db.role.findUnique.mockResolvedValue({ id: 1, code: "super_admin", isSystem: true });
    await expect(service.update(ACTOR, 1, { name: "Đổi tên" } as never)).rejects.toMatchObject({
      statusCode: 403,
      code: "SYSTEM_ROLE_LOCKED",
    });
    expect(db.role.update).not.toHaveBeenCalled();
  });

  it("cũng lọc bỏ permission is_restricted khi cập nhật (không chỉ lúc tạo)", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, code: "accountant", isSystem: false });
    mockAllowedPermissions([1]);
    db.rolePermission.deleteMany.mockResolvedValue({});
    db.rolePermission.createMany.mockResolvedValue({});
    db.role.update.mockResolvedValue({ id: 10 });

    await service.update(ACTOR, 10, { permissionIds: [1, 90] } as never);

    const rows = db.rolePermission.createMany.mock.calls[0]![0].data as { permissionId: number }[];
    expect(rows.map((r) => r.permissionId)).toEqual([1]);
  });

  it("thay toàn bộ permission (xoá cũ trước khi thêm mới)", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false });
    mockAllowedPermissions([2, 3]);
    db.rolePermission.deleteMany.mockResolvedValue({});
    db.rolePermission.createMany.mockResolvedValue({});
    db.role.update.mockResolvedValue({ id: 10 });

    await service.update(ACTOR, 10, { permissionIds: [2, 3] } as never);

    expect(db.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleId: 10 } });
  });

  it("xoá+thêm permission trong CÙNG 1 transaction (docs/12 BE-06) — lỗi giữa chừng không làm role mất sạch quyền", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false });
    mockAllowedPermissions([2, 3]);
    db.rolePermission.deleteMany.mockResolvedValue({});
    db.rolePermission.createMany.mockResolvedValue({});
    db.role.update.mockResolvedValue({ id: 10 });

    await service.update(ACTOR, 10, { permissionIds: [2, 3] } as never);

    expect(db.$transaction).toHaveBeenCalled();
  });

  it("không gửi permissionIds → giữ nguyên permission hiện có", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false });
    db.role.update.mockResolvedValue({ id: 10 });
    await service.update(ACTOR, 10, { name: "Tên mới" } as never);
    expect(db.rolePermission.deleteMany).not.toHaveBeenCalled();
  });

  it("404 khi role không tồn tại", async () => {
    db.role.findUnique.mockResolvedValue(null);
    await expect(service.update(ACTOR, 999, {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("remove", () => {
  it("chặn xoá System Role", async () => {
    db.role.findUnique.mockResolvedValue({ id: 1, isSystem: true, _count: { users: 0 } });
    await expect(service.remove(ACTOR, 1)).rejects.toMatchObject({ code: "SYSTEM_ROLE_LOCKED" });
    expect(db.role.delete).not.toHaveBeenCalled();
  });

  it("409 ROLE_IN_USE khi còn user đang gán role (tránh user mất hết quyền đột ngột)", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false, _count: { users: 3 } });
    await expect(service.remove(ACTOR, 10)).rejects.toMatchObject({
      statusCode: 409,
      code: "ROLE_IN_USE",
    });
  });

  it("xoá được Custom Role không còn ai dùng", async () => {
    db.role.findUnique.mockResolvedValue({ id: 10, isSystem: false, _count: { users: 0 } });
    db.role.delete.mockResolvedValue({});
    await service.remove(ACTOR, 10);
    expect(db.role.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "role.delete" }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/permissions/permissions.service";

const ACTOR = "superadmin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("list", () => {
  it("assignable=true loại bỏ permission is_restricted (dùng khi tick chọn cho role thường)", async () => {
    db.permission.findMany.mockResolvedValue([]);
    await service.list({ assignable: true } as never);
    expect(db.permission.findMany.mock.calls[0]![0].where).toEqual({ isRestricted: false });
  });

  it("không truyền assignable → trả về tất cả", async () => {
    db.permission.findMany.mockResolvedValue([]);
    await service.list({} as never);
    expect(db.permission.findMany.mock.calls[0]![0].where).toBeUndefined();
  });

  it("sắp xếp theo nhóm rồi tới code (để UI gom nhóm được)", async () => {
    db.permission.findMany.mockResolvedValue([]);
    await service.list({} as never);
    expect(db.permission.findMany.mock.calls[0]![0].orderBy).toEqual([{ groupName: "asc" }, { code: "asc" }]);
  });
});

describe("create", () => {
  it("permission tạo qua UI luôn isSystem = false và isRestricted = false", async () => {
    db.permission.findUnique.mockResolvedValue(null);
    db.permission.create.mockResolvedValue({ id: 50, code: "products.export" });

    await service.create(ACTOR, { code: "products.export", groupName: "products" } as never);

    expect(db.permission.create.mock.calls[0]![0].data).toMatchObject({
      isSystem: false,
      isRestricted: false,
    });
  });

  it("KHÔNG cho tự tạo permission is_restricted (chặn tự nâng quyền qua đường vòng)", async () => {
    db.permission.findUnique.mockResolvedValue(null);
    db.permission.create.mockResolvedValue({ id: 50 });

    await service.create(ACTOR, {
      code: "users.manage_v2",
      groupName: "users",
      isRestricted: true, // client cố tình gửi kèm
    } as never);

    expect(db.permission.create.mock.calls[0]![0].data.isRestricted).toBe(false);
  });

  it("409 khi code đã tồn tại", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, code: "products.export" });
    await expect(
      service.create(ACTOR, { code: "products.export", groupName: "products" } as never),
    ).rejects.toMatchObject({ statusCode: 409, code: "PERMISSION_CODE_TAKEN" });
  });
});

describe("update", () => {
  it("chặn đổi CODE của permission hệ thống — route trong code đang tham chiếu code cũ", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, code: "users.manage", isSystem: true });
    await expect(service.update(ACTOR, 1, { code: "users.manage_new" } as never)).rejects.toMatchObject({
      statusCode: 403,
      code: "SYSTEM_PERMISSION_LOCKED",
    });
    expect(db.permission.update).not.toHaveBeenCalled();
  });

  it("VẪN cho sửa description/groupName của permission hệ thống", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, code: "users.manage", isSystem: true });
    db.permission.update.mockResolvedValue({ id: 1 });
    await expect(
      service.update(ACTOR, 1, { description: "Mô tả rõ hơn" } as never),
    ).resolves.toBeDefined();
  });

  it("gửi lại đúng code cũ không bị coi là đổi code", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, code: "users.manage", isSystem: true });
    db.permission.update.mockResolvedValue({ id: 1 });
    await expect(service.update(ACTOR, 1, { code: "users.manage" } as never)).resolves.toBeDefined();
  });

  it("permission tự tạo (isSystem = false) đổi code thoải mái", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 50, code: "products.export", isSystem: false });
    db.permission.update.mockResolvedValue({ id: 50 });
    await expect(service.update(ACTOR, 50, { code: "products.export_v2" } as never)).resolves.toBeDefined();
  });
});

describe("remove", () => {
  it("chặn xoá permission hệ thống", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 1, isSystem: true, _count: { roles: 0 } });
    await expect(service.remove(ACTOR, 1)).rejects.toMatchObject({ code: "SYSTEM_PERMISSION_LOCKED" });
  });

  it("409 PERMISSION_IN_USE khi còn role đang gán", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 50, isSystem: false, _count: { roles: 2 } });
    await expect(service.remove(ACTOR, 50)).rejects.toMatchObject({ statusCode: 409, code: "PERMISSION_IN_USE" });
  });

  it("xoá được permission tự tạo chưa gán cho role nào", async () => {
    db.permission.findUnique.mockResolvedValue({ id: 50, isSystem: false, _count: { roles: 0 } });
    db.permission.delete.mockResolvedValue({});
    await service.remove(ACTOR, 50);
    expect(db.permission.delete).toHaveBeenCalledWith({ where: { id: 50 } });
  });
});

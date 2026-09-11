import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/files/folders.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("list", () => {
  it("bỏ trống parentId → xem cấp gốc (parentId null)", async () => {
    db.folder.findMany.mockResolvedValue([]);
    await service.list({} as never);
    expect(db.folder.findMany.mock.calls[0]![0].where).toEqual({ parentId: null });
  });

  it("truyền parentId → xem đúng cấp con của thư mục đó", async () => {
    db.folder.findMany.mockResolvedValue([]);
    await service.list({ parentId: "folder-1" } as never);
    expect(db.folder.findMany.mock.calls[0]![0].where).toEqual({ parentId: "folder-1" });
  });
});

describe("create", () => {
  it("tạo thư mục gốc (không parentId) và ghi audit log", async () => {
    db.folder.create.mockResolvedValue({ id: "folder-1" });
    const folder = await service.create(ACTOR, { name: "Ảnh sản phẩm" } as never);
    expect(db.folder.create.mock.calls[0]![0].data).toMatchObject({
      name: "Ảnh sản phẩm",
      parentId: null,
      createdBy: ACTOR,
    });
    expect(folder.id).toBe("folder-1");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "folder.create", entityType: "folder" }),
    );
  });

  it("404 PARENT_NOT_FOUND khi thư mục cha không tồn tại", async () => {
    db.folder.findUnique.mockResolvedValue(null);
    await expect(
      service.create(ACTOR, {
        name: "Con",
        parentId: "11111111-1111-1111-1111-111111111111",
      } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "PARENT_NOT_FOUND" });
  });
});

describe("update", () => {
  it("404 khi thư mục không tồn tại", async () => {
    db.folder.findUnique.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("chặn chọn CHÍNH NÓ làm thư mục cha", async () => {
    db.folder.findUnique.mockResolvedValue({ id: "folder-1" });
    await expect(
      service.update(ACTOR, "folder-1", { parentId: "folder-1" } as never),
    ).rejects.toMatchObject({ statusCode: 400, code: "FOLDER_CYCLE" });
  });

  it("chặn chọn thư mục CON làm cha (tạo vòng lặp trong cây)", async () => {
    // folder-1 là ông; folder-2 con của folder-1; folder-3 con của folder-2.
    db.folder.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "folder-1": { id: "folder-1", parentId: null },
        "folder-2": { id: "folder-2", parentId: "folder-1" },
        "folder-3": { id: "folder-3", parentId: "folder-2" },
      };
      return tree[where.id] ?? null;
    });

    await expect(
      service.update(ACTOR, "folder-1", { parentId: "folder-3" } as never),
    ).rejects.toMatchObject({ code: "FOLDER_CYCLE" });
  });

  it("cho phép gán cha hợp lệ và ghi audit log kèm before/after", async () => {
    db.folder.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "folder-1": { id: "folder-1", parentId: null },
        "folder-9": { id: "folder-9", parentId: null },
      };
      return tree[where.id] ?? null;
    });
    db.folder.update.mockResolvedValue({ id: "folder-1", parentId: "folder-9" });

    await service.update(ACTOR, "folder-1", { parentId: "folder-9" } as never);

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "folder.update", entityType: "folder" }),
    );
  });

  it("thoát an toàn nếu dữ liệu lỡ đã có vòng lặp sẵn (không loop vô hạn)", async () => {
    db.folder.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "folder-1": { id: "folder-1", parentId: null },
        "folder-a": { id: "folder-a", parentId: "folder-b" },
        "folder-b": { id: "folder-b", parentId: "folder-a" }, // vòng lặp sẵn có
      };
      return tree[where.id] ?? null;
    });
    db.folder.update.mockResolvedValue({ id: "folder-1" });
    await expect(
      service.update(ACTOR, "folder-1", { parentId: "folder-a" } as never),
    ).resolves.toBeDefined();
  });
});

describe("remove", () => {
  it("409 FOLDER_NOT_EMPTY khi còn thư mục con", async () => {
    db.folder.findUnique.mockResolvedValue({
      id: "folder-1",
      _count: { folders: 2, files: 0 },
    });
    await expect(service.remove(ACTOR, "folder-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "FOLDER_NOT_EMPTY",
    });
    expect(db.folder.delete).not.toHaveBeenCalled();
  });

  it("409 FOLDER_NOT_EMPTY khi còn file bên trong", async () => {
    db.folder.findUnique.mockResolvedValue({
      id: "folder-1",
      _count: { folders: 0, files: 3 },
    });
    await expect(service.remove(ACTOR, "folder-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "FOLDER_NOT_EMPTY",
    });
  });

  it("xoá được thư mục rỗng và ghi audit log", async () => {
    db.folder.findUnique.mockResolvedValue({ id: "folder-1", _count: { folders: 0, files: 0 } });
    db.folder.delete.mockResolvedValue({});
    await service.remove(ACTOR, "folder-1", "1.2.3.4");
    expect(db.folder.delete).toHaveBeenCalledWith({ where: { id: "folder-1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "folder.delete",
        entityType: "folder",
        ipAddress: "1.2.3.4",
      }),
    );
  });

  it("404 khi thư mục không tồn tại", async () => {
    db.folder.findUnique.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "khong-co")).rejects.toMatchObject({ statusCode: 404 });
  });
});

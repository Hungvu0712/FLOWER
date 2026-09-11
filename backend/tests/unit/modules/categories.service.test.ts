import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as filesService from "@/modules/core/files/files.service";
import * as service from "@/modules/domain/categories/categories.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  vi.spyOn(filesService, "setEntityFile").mockResolvedValue(undefined);
});

describe("listPublic — dữ liệu cho storefront", () => {
  it("chỉ trả danh mục đang bật", async () => {
    db.category.findMany.mockResolvedValue([]);
    await service.listPublic();
    expect(db.category.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });

  it("KHÔNG lộ trường nội bộ (sortOrder, timestamps) ra API công khai", async () => {
    db.category.findMany.mockResolvedValue([]);
    await service.listPublic();
    const select = db.category.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("sortOrder");
    expect(select).not.toHaveProperty("createdAt");
    expect(select).not.toHaveProperty("isActive");
  });
});

describe("list — dữ liệu cho admin", () => {
  it("mặc định chỉ lấy danh mục đang bật", async () => {
    db.category.findMany.mockResolvedValue([]);
    await service.list({} as never);
    expect(db.category.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });

  it("includeInactive=true lấy tất cả", async () => {
    db.category.findMany.mockResolvedValue([]);
    await service.list({ includeInactive: true } as never);
    expect(db.category.findMany.mock.calls[0]![0].where).toBeUndefined();
  });
});

describe("create", () => {
  it("tự sinh slug từ tên tiếng Việt khi không truyền slug", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.create.mockResolvedValue({ id: "cat-1" });
    await service.create(ACTOR, { name: "Hoa Sinh Nhật" } as never);
    expect(db.category.create.mock.calls[0]![0].data.slug).toBe("hoa-sinh-nhat");
  });

  it("thêm hậu tố -2 khi slug đã tồn tại", async () => {
    db.category.findFirst.mockResolvedValueOnce({ id: "khac" }).mockResolvedValueOnce(null);
    db.category.create.mockResolvedValue({ id: "cat-1" });
    await service.create(ACTOR, { name: "Hoa cưới" } as never);
    expect(db.category.create.mock.calls[0]![0].data.slug).toBe("hoa-cuoi-2");
  });

  it("tăng hậu tố tới khi tìm được slug trống", async () => {
    db.category.findFirst
      .mockResolvedValueOnce({ id: "a" })
      .mockResolvedValueOnce({ id: "b" })
      .mockResolvedValueOnce(null);
    db.category.create.mockResolvedValue({ id: "cat-1" });
    await service.create(ACTOR, { name: "Hoa lan" } as never);
    expect(db.category.create.mock.calls[0]![0].data.slug).toBe("hoa-lan-3");
  });

  it("404 PARENT_NOT_FOUND khi danh mục cha không tồn tại", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.findUnique.mockResolvedValue(null);
    await expect(
      service.create(ACTOR, {
        name: "Con",
        parentId: "11111111-1111-1111-1111-111111111111",
      } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "PARENT_NOT_FOUND" });
  });

  it("đánh dấu ảnh đang được dùng để job dọn file mồ côi không xoá nhầm", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.create.mockResolvedValue({ id: "cat-1" });
    await service.create(ACTOR, { name: "Hoa lan", imageFileId: "file-1" } as never);
    expect(filesService.setEntityFile).toHaveBeenCalledWith({
      fileId: "file-1",
      entityType: "category_image",
      entityId: "cat-1",
    });
  });

  it("giá trị mặc định: sortOrder = 0, isActive = true", async () => {
    db.category.findFirst.mockResolvedValue(null);
    db.category.create.mockResolvedValue({ id: "cat-1" });
    await service.create(ACTOR, { name: "X" } as never);
    expect(db.category.create.mock.calls[0]![0].data).toMatchObject({
      sortOrder: 0,
      isActive: true,
    });
  });
});

describe("update", () => {
  it("đổi TÊN không tự đổi slug (tránh gãy link đã chia sẻ)", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "hoa-cuoi" });
    db.category.update.mockResolvedValue({ id: "cat-1" });
    await service.update(ACTOR, "cat-1", { name: "Hoa cưới cao cấp" } as never);
    expect(db.category.update.mock.calls[0]![0].data).not.toHaveProperty("slug");
  });

  it("chỉ đổi slug khi người dùng chủ động sửa slug", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat-1", slug: "hoa-cuoi" });
    db.category.findFirst.mockResolvedValue(null);
    db.category.update.mockResolvedValue({ id: "cat-1" });
    await service.update(ACTOR, "cat-1", { slug: "Hoa Cưới Cao Cấp" } as never);
    expect(db.category.update.mock.calls[0]![0].data.slug).toBe("hoa-cuoi-cao-cap");
  });

  it("chặn chọn CHÍNH NÓ làm danh mục cha", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat-1" });
    await expect(
      service.update(ACTOR, "cat-1", { parentId: "cat-1" } as never),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "CATEGORY_CYCLE",
    });
  });

  it("chặn chọn danh mục CON làm cha (tạo vòng lặp trong cây)", async () => {
    // cat-1 là ông; cat-2 con của cat-1; cat-3 con của cat-2.
    // Gán cat-3 làm cha của cat-1 → vòng lặp.
    db.category.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "cat-1": { id: "cat-1", parentId: null },
        "cat-2": { id: "cat-2", parentId: "cat-1" },
        "cat-3": { id: "cat-3", parentId: "cat-2" },
      };
      return tree[where.id] ?? null;
    });

    await expect(
      service.update(ACTOR, "cat-1", { parentId: "cat-3" } as never),
    ).rejects.toMatchObject({
      code: "CATEGORY_CYCLE",
    });
  });

  it("cho phép gán cha hợp lệ (không tạo vòng lặp)", async () => {
    db.category.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "cat-1": { id: "cat-1", parentId: null },
        "cat-9": { id: "cat-9", parentId: null },
      };
      return tree[where.id] ?? null;
    });
    db.category.update.mockResolvedValue({ id: "cat-1" });
    await expect(
      service.update(ACTOR, "cat-1", { parentId: "cat-9" } as never),
    ).resolves.toBeDefined();
  });

  it("thoát an toàn nếu dữ liệu lỡ đã có vòng lặp sẵn (không loop vô hạn)", async () => {
    db.category.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const tree: Record<string, { id: string; parentId: string | null }> = {
        "cat-1": { id: "cat-1", parentId: null },
        "cat-a": { id: "cat-a", parentId: "cat-b" },
        "cat-b": { id: "cat-b", parentId: "cat-a" }, // vòng lặp sẵn có
      };
      return tree[where.id] ?? null;
    });
    db.category.update.mockResolvedValue({ id: "cat-1" });
    await expect(
      service.update(ACTOR, "cat-1", { parentId: "cat-a" } as never),
    ).resolves.toBeDefined();
  });

  it("404 khi danh mục không tồn tại", async () => {
    db.category.findUnique.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("remove", () => {
  it("409 CATEGORY_HAS_CHILDREN khi còn danh mục con", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat-1", _count: { children: 2 } });
    await expect(service.remove(ACTOR, "cat-1")).rejects.toMatchObject({
      statusCode: 409,
      code: "CATEGORY_HAS_CHILDREN",
    });
    expect(db.category.delete).not.toHaveBeenCalled();
  });

  it("xoá được danh mục lá và ghi audit log", async () => {
    db.category.findUnique.mockResolvedValue({ id: "cat-1", _count: { children: 0 } });
    db.category.delete.mockResolvedValue({});
    await service.remove(ACTOR, "cat-1", "1.2.3.4");
    expect(db.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "category.delete",
        entityType: "category",
        ipAddress: "1.2.3.4",
      }),
    );
  });
});

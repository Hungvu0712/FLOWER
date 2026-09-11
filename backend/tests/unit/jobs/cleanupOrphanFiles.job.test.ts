import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as filesService from "@/modules/core/files/files.service";
import { cleanupOrphanFiles } from "@/jobs/cleanupOrphanFiles.job";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(filesService, "purgeFileFromCloudinary").mockResolvedValue(undefined);
});

describe("cleanupOrphanFiles — cửa sổ an toàn 24h (docs/12 BE-09)", () => {
  it("truy vấn file xoá mềm CHỈ với điều kiện deletedAt cũ hơn cutoff, không xoá ngay lập tức", async () => {
    db.file.findMany.mockResolvedValue([]);

    await cleanupOrphanFiles();

    const where = db.file.findMany.mock.calls[0]![0].where;
    const deletedBranch = where.OR.find(
      (clause: Record<string, unknown>) => "deletedAt" in clause && clause.deletedAt !== null,
    );
    // Trước khi sửa BE-09: clause này là `{ deletedAt: { not: null } }` — xoá NGAY mọi file vừa xoá
    // mềm bất kể mới hay cũ. Phải có điều kiện thời gian `lt: cutoff` giống nhánh mồ côi.
    expect(deletedBranch).toHaveProperty("deletedAt.lt");
    expect(deletedBranch.deletedAt).not.toHaveProperty("not");
  });

  it("xoá cả file mồ côi (chưa dùng, tạo lâu) và file xoá mềm (đủ 24h) trả về từ query", async () => {
    db.file.findMany.mockResolvedValue([
      { id: "f1", cloudinaryPublicId: "p1" },
      { id: "f2", cloudinaryPublicId: "p2" },
    ]);
    db.file.delete.mockResolvedValue({});

    await cleanupOrphanFiles();

    expect(filesService.purgeFileFromCloudinary).toHaveBeenCalledWith("p1");
    expect(filesService.purgeFileFromCloudinary).toHaveBeenCalledWith("p2");
    expect(db.file.delete).toHaveBeenCalledTimes(2);
  });

  it("1 file lỗi khi purge Cloudinary không chặn các file còn lại", async () => {
    db.file.findMany.mockResolvedValue([
      { id: "f1", cloudinaryPublicId: "loi" },
      { id: "f2", cloudinaryPublicId: "ok" },
    ]);
    (
      filesService.purgeFileFromCloudinary as unknown as ReturnType<typeof vi.fn>
    ).mockImplementation(async (publicId: string) => {
      if (publicId === "loi") throw new Error("Cloudinary lỗi");
    });
    db.file.delete.mockResolvedValue({});

    await cleanupOrphanFiles();

    expect(db.file.delete).toHaveBeenCalledTimes(1);
    expect(db.file.delete).toHaveBeenCalledWith({ where: { id: "f2" } });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/siteContent/siteContent.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("list — chỉ lấy đúng key-set của site content (không lẫn system_settings)", () => {
  it("lọc where.key theo SITE_CONTENT_KEYS", async () => {
    db.systemSetting.findMany.mockResolvedValue([]);
    await service.list();
    const where = db.systemSetting.findMany.mock.calls[0]![0].where;
    expect(where.key.in).toEqual(
      expect.arrayContaining(["hero_banner", "hotline", "zalo_link", "address", "open_hours"]),
    );
  });

  it("giải mã đúng value từ cột value dạng JSON string", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "hotline", value: JSON.stringify("0900 000 000"), updatedAt: new Date() },
      { key: "hero_banner", value: JSON.stringify(null), updatedAt: new Date() },
    ]);

    const result = await service.list();

    expect(result).toEqual([
      { key: "hotline", value: "0900 000 000", updatedAt: expect.any(Date) },
      { key: "hero_banner", value: null, updatedAt: expect.any(Date) },
    ]);
  });

  it("hero_banner có fileId → join thêm url (giống site_logo)", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "hero_banner", value: JSON.stringify("file-9"), updatedAt: new Date() },
    ]);
    db.file.findUnique.mockResolvedValue({ url: "https://res.cloudinary.com/banner-9.jpg" });

    const result = await service.list();

    expect(result[0]?.value).toEqual({
      fileId: "file-9",
      url: "https://res.cloudinary.com/banner-9.jpg",
    });
  });
});

describe("update — validate value ĐÚNG KIỂU theo từng key", () => {
  it("hotline quá ngắn → 422 VALIDATION_ERROR, KHÔNG ghi DB", async () => {
    await expect(service.update(ACTOR, "hotline", "090")).rejects.toMatchObject({
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("zalo_link không phải URL hợp lệ → 422", async () => {
    await expect(service.update(ACTOR, "zalo_link", "khong-phai-url")).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("address rỗng → 422", async () => {
    await expect(service.update(ACTOR, "address", "")).rejects.toMatchObject({ statusCode: 422 });
  });

  it("hero_banner không phải uuid hợp lệ → 422, nhưng null (gỡ banner) thì hợp lệ", async () => {
    await expect(service.update(ACTOR, "hero_banner", "khong-phai-uuid")).rejects.toMatchObject({
      statusCode: 422,
    });

    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "hero_banner",
      value: JSON.stringify(null),
      updatedAt: new Date(),
    });
    await expect(service.update(ACTOR, "hero_banner", null)).resolves.toMatchObject({ value: null });
  });

  it("hero_banner hợp lệ → đánh dấu file_usages (entityType site_content) VÀ trả kèm url đã join", async () => {
    const FILE_ID = "11111111-1111-1111-1111-111111111111";
    db.file.findUnique.mockResolvedValue({
      id: FILE_ID,
      deletedAt: null,
      url: "https://res.cloudinary.com/banner.jpg",
    });
    db.fileUsage.deleteMany.mockResolvedValue({});
    db.fileUsage.create.mockResolvedValue({});
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "hero_banner",
      value: JSON.stringify(FILE_ID),
      updatedAt: new Date(),
    });

    const result = await service.update(ACTOR, "hero_banner", FILE_ID);

    expect(db.fileUsage.create).toHaveBeenCalledWith({
      data: { fileId: FILE_ID, entityType: "site_content", entityId: "hero_banner" },
    });
    expect(result.value).toEqual({ fileId: FILE_ID, url: "https://res.cloudinary.com/banner.jpg" });
  });

  it("hero_banner trỏ tới file không tồn tại → 404 FILE_NOT_FOUND, KHÔNG ghi system_settings", async () => {
    db.file.findUnique.mockResolvedValue(null);
    await expect(
      service.update(ACTOR, "hero_banner", "22222222-2222-2222-2222-222222222222"),
    ).rejects.toMatchObject({ statusCode: 404, code: "FILE_NOT_FOUND" });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("hero_banner = null → gỡ file_usages hiện có (clearEntityFile), không gọi setEntityFile", async () => {
    db.fileUsage.deleteMany.mockResolvedValue({});
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "hero_banner",
      value: JSON.stringify(null),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "hero_banner", null);

    expect(db.fileUsage.deleteMany).toHaveBeenCalledWith({
      where: { entityType: "site_content", entityId: "hero_banner" },
    });
    expect(db.fileUsage.create).not.toHaveBeenCalled();
  });

  it("hợp lệ → upsert đúng key, JSON-encode value, ghi updatedBy", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "address",
      value: JSON.stringify("456 Đường Mới, Quận 3"),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "address", "456 Đường Mới, Quận 3");

    expect(db.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "address" },
      create: { key: "address", value: JSON.stringify("456 Đường Mới, Quận 3"), updatedBy: ACTOR },
      update: { value: JSON.stringify("456 Đường Mới, Quận 3"), updatedBy: ACTOR },
    });
  });

  it("ghi audit log kèm before/after đã giải mã và action site_content.update", async () => {
    db.systemSetting.findUnique.mockResolvedValue({
      key: "hotline",
      value: JSON.stringify("0900 000 000"),
    });
    db.systemSetting.upsert.mockResolvedValue({
      key: "hotline",
      value: JSON.stringify("0911 111 111"),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "hotline", "0911 111 111", "1.2.3.4");

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site_content.update",
        entityType: "site_content",
        entityId: "hotline",
        before: { value: "0900 000 000" },
        after: { value: "0911 111 111" },
        ipAddress: "1.2.3.4",
      }),
    );
  });
});

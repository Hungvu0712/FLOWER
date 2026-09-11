import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/core/settings/systemSettings.service";

const ACTOR = "superadmin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("list — trả value đã JSON.parse ngược lại đúng kiểu gốc", () => {
  it("giải mã đúng string/boolean/null từ cột value dạng JSON string", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "site_name", value: JSON.stringify("Hoa Xinh"), updatedAt: new Date() },
      { key: "registration_enabled", value: JSON.stringify(true), updatedAt: new Date() },
      { key: "site_logo", value: JSON.stringify(null), updatedAt: new Date() },
    ]);

    const result = await service.list();

    expect(result).toEqual([
      { key: "site_name", value: "Hoa Xinh", updatedAt: expect.any(Date) },
      { key: "registration_enabled", value: true, updatedAt: expect.any(Date) },
      { key: "site_logo", value: null, updatedAt: expect.any(Date) },
    ]);
  });
});

describe("getValue — đọc 1 giá trị cho nơi khác dùng làm điều kiện nghiệp vụ", () => {
  it("key chưa được seed → trả undefined, KHÔNG throw", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    await expect(service.getValue("registration_enabled")).resolves.toBeUndefined();
  });

  it("key đã có → giải mã đúng giá trị JSON", async () => {
    db.systemSetting.findUnique.mockResolvedValue({
      key: "registration_enabled",
      value: JSON.stringify(false),
    });
    await expect(service.getValue("registration_enabled")).resolves.toBe(false);
  });
});

describe("update — validate value ĐÚNG KIỂU theo từng key (docs/12, Phase 4)", () => {
  it("site_name rỗng → 422 VALIDATION_ERROR, KHÔNG ghi DB", async () => {
    await expect(service.update(ACTOR, "site_name", "")).rejects.toMatchObject({
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("registration_enabled gửi string thay vì boolean → 422", async () => {
    await expect(service.update(ACTOR, "registration_enabled", "true")).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it("site_logo không phải uuid hợp lệ → 422, nhưng null (bỏ logo) thì hợp lệ", async () => {
    await expect(service.update(ACTOR, "site_logo", "khong-phai-uuid")).rejects.toMatchObject({
      statusCode: 422,
    });

    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "site_logo",
      value: JSON.stringify(null),
      updatedAt: new Date(),
    });
    await expect(service.update(ACTOR, "site_logo", null)).resolves.toMatchObject({ value: null });
  });

  it("site_logo hợp lệ → đánh dấu file_usages (setEntityFile) VÀ trả kèm url đã join, không chỉ fileId thô", async () => {
    const FILE_ID = "11111111-1111-1111-1111-111111111111";
    db.file.findUnique.mockResolvedValue({
      id: FILE_ID,
      deletedAt: null,
      url: "https://res.cloudinary.com/logo.png",
    });
    db.fileUsage.deleteMany.mockResolvedValue({});
    db.fileUsage.create.mockResolvedValue({});
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "site_logo",
      value: JSON.stringify(FILE_ID),
      updatedAt: new Date(),
    });

    const result = await service.update(ACTOR, "site_logo", FILE_ID);

    expect(db.fileUsage.create).toHaveBeenCalledWith({
      data: { fileId: FILE_ID, entityType: "system_setting", entityId: "site_logo" },
    });
    expect(result.value).toEqual({ fileId: FILE_ID, url: "https://res.cloudinary.com/logo.png" });
  });

  it("site_logo trỏ tới file không tồn tại → 404 FILE_NOT_FOUND, KHÔNG ghi system_settings", async () => {
    db.file.findUnique.mockResolvedValue(null);
    await expect(
      service.update(ACTOR, "site_logo", "22222222-2222-2222-2222-222222222222"),
    ).rejects.toMatchObject({ statusCode: 404, code: "FILE_NOT_FOUND" });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("site_logo = null → gỡ file_usages hiện có (clearEntityFile), không gọi setEntityFile", async () => {
    db.fileUsage.deleteMany.mockResolvedValue({});
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "site_logo",
      value: JSON.stringify(null),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "site_logo", null);

    expect(db.fileUsage.deleteMany).toHaveBeenCalledWith({
      where: { entityType: "system_setting", entityId: "site_logo" },
    });
    expect(db.fileUsage.create).not.toHaveBeenCalled();
  });

  it("list() cũng join url cho site_logo (không chỉ update())", async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: "site_logo", value: JSON.stringify("file-9"), updatedAt: new Date() },
    ]);
    db.file.findUnique.mockResolvedValue({ url: "https://res.cloudinary.com/9.png" });

    const result = await service.list();

    expect(result[0]?.value).toEqual({ fileId: "file-9", url: "https://res.cloudinary.com/9.png" });
  });

  it("hợp lệ → upsert đúng key, JSON-encode value, ghi updatedBy", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "site_name",
      value: JSON.stringify("Cửa hàng hoa mới"),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "site_name", "Cửa hàng hoa mới");

    expect(db.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "site_name" },
      create: { key: "site_name", value: JSON.stringify("Cửa hàng hoa mới"), updatedBy: ACTOR },
      update: { value: JSON.stringify("Cửa hàng hoa mới"), updatedBy: ACTOR },
    });
  });

  it("ghi audit log kèm before/after đã giải mã (không phải chuỗi JSON thô)", async () => {
    db.systemSetting.findUnique.mockResolvedValue({
      key: "registration_enabled",
      value: JSON.stringify(true),
    });
    db.systemSetting.upsert.mockResolvedValue({
      key: "registration_enabled",
      value: JSON.stringify(false),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "registration_enabled", false, "1.2.3.4");

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "system_setting.update",
        entityType: "system_setting",
        entityId: "registration_enabled",
        before: { value: true },
        after: { value: false },
        ipAddress: "1.2.3.4",
      }),
    );
  });

  it("key chưa từng tồn tại → audit log before = null (không phải {value: undefined})", async () => {
    db.systemSetting.findUnique.mockResolvedValue(null);
    db.systemSetting.upsert.mockResolvedValue({
      key: "timezone",
      value: JSON.stringify("Asia/Ho_Chi_Minh"),
      updatedAt: new Date(),
    });

    await service.update(ACTOR, "timezone", "Asia/Ho_Chi_Minh");

    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({ before: null }));
  });
});

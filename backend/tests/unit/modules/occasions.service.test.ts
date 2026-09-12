import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/occasions/occasions.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("listPublic — dữ liệu cho storefront", () => {
  it("chỉ trả dịp lễ đang bật", async () => {
    db.occasion.findMany.mockResolvedValue([]);
    await service.listPublic();
    expect(db.occasion.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });

  it("KHÔNG lộ trường nội bộ (sortOrder, timestamps) ra API công khai", async () => {
    db.occasion.findMany.mockResolvedValue([]);
    await service.listPublic();
    const select = db.occasion.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("sortOrder");
    expect(select).not.toHaveProperty("createdAt");
    expect(select).not.toHaveProperty("isActive");
  });
});

describe("list — dữ liệu cho admin", () => {
  it("mặc định chỉ lấy dịp lễ đang bật", async () => {
    db.occasion.findMany.mockResolvedValue([]);
    await service.list({} as never);
    expect(db.occasion.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });

  it("includeInactive=true lấy tất cả", async () => {
    db.occasion.findMany.mockResolvedValue([]);
    await service.list({ includeInactive: true } as never);
    expect(db.occasion.findMany.mock.calls[0]![0].where).toBeUndefined();
  });
});

describe("create", () => {
  it("tự sinh slug từ tên tiếng Việt khi không truyền slug", async () => {
    db.occasion.findFirst.mockResolvedValue(null);
    db.occasion.create.mockResolvedValue({ id: "o1" });
    await service.create(ACTOR, { name: "Sinh Nhật" } as never);
    expect(db.occasion.create.mock.calls[0]![0].data.slug).toBe("sinh-nhat");
  });

  it("thêm hậu tố -2 khi slug đã tồn tại", async () => {
    db.occasion.findFirst.mockResolvedValueOnce({ id: "khac" }).mockResolvedValueOnce(null);
    db.occasion.create.mockResolvedValue({ id: "o1" });
    await service.create(ACTOR, { name: "Cảm ơn" } as never);
    expect(db.occasion.create.mock.calls[0]![0].data.slug).toBe("cam-on-2");
  });

  it("giá trị mặc định: sortOrder = 0, isActive = true", async () => {
    db.occasion.findFirst.mockResolvedValue(null);
    db.occasion.create.mockResolvedValue({ id: "o1" });
    await service.create(ACTOR, { name: "X" } as never);
    expect(db.occasion.create.mock.calls[0]![0].data).toMatchObject({
      sortOrder: 0,
      isActive: true,
    });
  });

  it("ghi audit log khi tạo", async () => {
    db.occasion.findFirst.mockResolvedValue(null);
    db.occasion.create.mockResolvedValue({ id: "o1", name: "X" });
    await service.create(ACTOR, { name: "X" } as never, "1.2.3.4");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "occasion.create",
        entityType: "occasion",
        ipAddress: "1.2.3.4",
      }),
    );
  });
});

describe("update", () => {
  it("đổi TÊN không tự đổi slug (tránh gãy link đã chia sẻ)", async () => {
    db.occasion.findUnique.mockResolvedValue({ id: "o1", slug: "cam-on" });
    db.occasion.update.mockResolvedValue({ id: "o1" });
    await service.update(ACTOR, "o1", { name: "Cảm ơn đặc biệt" } as never);
    expect(db.occasion.update.mock.calls[0]![0].data).not.toHaveProperty("slug");
  });

  it("chỉ đổi slug khi người dùng chủ động sửa slug", async () => {
    db.occasion.findUnique.mockResolvedValue({ id: "o1", slug: "cam-on" });
    db.occasion.findFirst.mockResolvedValue(null);
    db.occasion.update.mockResolvedValue({ id: "o1" });
    await service.update(ACTOR, "o1", { slug: "Cảm Ơn Mới" } as never);
    expect(db.occasion.update.mock.calls[0]![0].data.slug).toBe("cam-on-moi");
  });

  it("404 khi dịp lễ không tồn tại", async () => {
    db.occasion.findUnique.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("remove", () => {
  it("404 khi dịp lễ không tồn tại", async () => {
    db.occasion.findUnique.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "khong-co")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(db.occasion.delete).not.toHaveBeenCalled();
  });

  it("xoá được dù còn sản phẩm đang gắn (chỉ gỡ tag, KHÁC categories chặn xoá khi còn con)", async () => {
    db.occasion.findUnique.mockResolvedValue({ id: "o1" });
    db.occasion.delete.mockResolvedValue({});
    await service.remove(ACTOR, "o1", "1.2.3.4");
    expect(db.occasion.delete).toHaveBeenCalledWith({ where: { id: "o1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "occasion.delete",
        entityType: "occasion",
        ipAddress: "1.2.3.4",
      }),
    );
  });
});

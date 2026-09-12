import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as service from "@/modules/domain/specialDates/specialDates.service";

const USER = "user-1";

beforeEach(() => {
  resetPrismaMock();
});

describe("list — row-level check (docs/12 §5.1)", () => {
  it("chỉ truy vấn ngày đặc biệt của ĐÚNG user đang đăng nhập", async () => {
    db.specialDate.findMany.mockResolvedValue([]);
    await service.list(USER);
    expect(db.specialDate.findMany.mock.calls[0]![0].where).toEqual({ userId: USER });
  });
});

describe("create", () => {
  it("gán đúng userId từ tham số (không tin userId từ body)", async () => {
    db.specialDate.create.mockResolvedValue({ id: "sd-1" });
    await service.create(USER, { label: "Sinh nhật mẹ", date: "2000-05-15" } as never);
    expect(db.specialDate.create.mock.calls[0]![0].data.userId).toBe(USER);
  });

  it("neo giờ UTC khi tạo Date cho cột @db.Date (tránh lệch ngày do múi giờ server)", async () => {
    db.specialDate.create.mockResolvedValue({ id: "sd-1" });
    await service.create(USER, { label: "Sinh nhật mẹ", date: "2000-05-15" } as never);
    const savedDate = db.specialDate.create.mock.calls[0]![0].data.date as Date;
    expect(savedDate.toISOString()).toBe("2000-05-15T00:00:00.000Z");
  });

  it("bỏ trống remindDaysBefore → mặc định 3", async () => {
    db.specialDate.create.mockResolvedValue({ id: "sd-1" });
    await service.create(USER, { label: "X", date: "2000-01-01" } as never);
    expect(db.specialDate.create.mock.calls[0]![0].data.remindDaysBefore).toBe(3);
  });

  it("dùng đúng remindDaysBefore khi có truyền", async () => {
    db.specialDate.create.mockResolvedValue({ id: "sd-1" });
    await service.create(USER, { label: "X", date: "2000-01-01", remindDaysBefore: 7 } as never);
    expect(db.specialDate.create.mock.calls[0]![0].data.remindDaysBefore).toBe(7);
  });
});

describe("update", () => {
  it("404 khi ngày đặc biệt không tồn tại HOẶC không thuộc user đang đăng nhập (chống IDOR)", async () => {
    db.specialDate.findFirst.mockResolvedValue(null);
    await expect(service.update(USER, "sd-x", { label: "B" } as never)).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
    expect(db.specialDate.update).not.toHaveBeenCalled();
  });

  it("ownership check lọc CẢ id LẪN userId trong where — không chỉ id", async () => {
    db.specialDate.findFirst.mockResolvedValue({ id: "sd-1", userId: USER });
    db.specialDate.update.mockResolvedValue({ id: "sd-1" });
    await service.update(USER, "sd-1", { label: "B" } as never);
    expect(db.specialDate.findFirst.mock.calls[0]![0].where).toEqual({ id: "sd-1", userId: USER });
  });

  it("chỉ đổi LABEL — không đụng lastRemindedYear", async () => {
    db.specialDate.findFirst.mockResolvedValue({ id: "sd-1", userId: USER });
    db.specialDate.update.mockResolvedValue({ id: "sd-1" });
    await service.update(USER, "sd-1", { label: "B" } as never);
    expect(db.specialDate.update.mock.calls[0]![0].data).toEqual({ label: "B" });
  });

  it("đổi DATE → reset lastRemindedYear về null (coi như chưa từng nhắc lượt mới)", async () => {
    db.specialDate.findFirst.mockResolvedValue({ id: "sd-1", userId: USER });
    db.specialDate.update.mockResolvedValue({ id: "sd-1" });
    await service.update(USER, "sd-1", { date: "2001-06-20" } as never);
    expect(db.specialDate.update.mock.calls[0]![0].data).toMatchObject({ lastRemindedYear: null });
  });

  it("đổi remindDaysBefore → cũng reset lastRemindedYear", async () => {
    db.specialDate.findFirst.mockResolvedValue({ id: "sd-1", userId: USER });
    db.specialDate.update.mockResolvedValue({ id: "sd-1" });
    await service.update(USER, "sd-1", { remindDaysBefore: 5 } as never);
    expect(db.specialDate.update.mock.calls[0]![0].data).toMatchObject({ lastRemindedYear: null });
  });
});

describe("remove", () => {
  it("404 khi ngày đặc biệt không tồn tại HOẶC không thuộc user đang đăng nhập", async () => {
    db.specialDate.findFirst.mockResolvedValue(null);
    await expect(service.remove(USER, "sd-x")).rejects.toMatchObject({ statusCode: 404 });
    expect(db.specialDate.delete).not.toHaveBeenCalled();
  });

  it("xoá được ngày đặc biệt của chính mình", async () => {
    db.specialDate.findFirst.mockResolvedValue({ id: "sd-1", userId: USER });
    db.specialDate.delete.mockResolvedValue({});
    await service.remove(USER, "sd-1");
    expect(db.specialDate.delete).toHaveBeenCalledWith({ where: { id: "sd-1" } });
  });
});

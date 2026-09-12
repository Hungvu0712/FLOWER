import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as service from "@/modules/domain/addresses/addresses.service";

const USER = "user-1";

beforeEach(() => {
  resetPrismaMock();
});

describe("list — row-level check (docs/12 §5.1)", () => {
  it("chỉ truy vấn địa chỉ của ĐÚNG user đang đăng nhập", async () => {
    db.address.findMany.mockResolvedValue([]);
    await service.list(USER);
    expect(db.address.findMany.mock.calls[0]![0].where).toEqual({ userId: USER });
  });

  it("sắp xếp: mặc định trước, cũ nhất trước", async () => {
    db.address.findMany.mockResolvedValue([]);
    await service.list(USER);
    expect(db.address.findMany.mock.calls[0]![0].orderBy).toEqual([
      { isDefault: "desc" },
      { createdAt: "asc" },
    ]);
  });
});

describe("create", () => {
  it("địa chỉ ĐẦU TIÊN của user tự động là mặc định dù không truyền isDefault", async () => {
    db.address.count.mockResolvedValue(0);
    db.address.updateMany.mockResolvedValue({});
    db.address.create.mockResolvedValue({ id: "addr-1" });
    await service.create(USER, {
      recipientName: "A",
      recipientPhone: "0900000000",
      addressLine: "X",
    });
    expect(db.address.create.mock.calls[0]![0].data.isDefault).toBe(true);
  });

  it("địa chỉ THỨ 2 trở đi KHÔNG tự mặc định nếu không truyền isDefault", async () => {
    db.address.count.mockResolvedValue(1);
    db.address.create.mockResolvedValue({ id: "addr-2" });
    await service.create(USER, {
      recipientName: "A",
      recipientPhone: "0900000000",
      addressLine: "X",
    });
    expect(db.address.create.mock.calls[0]![0].data.isDefault).toBe(false);
  });

  it("truyền isDefault: true → unset địa chỉ mặc định CŨ của user trước khi tạo cái mới", async () => {
    db.address.count.mockResolvedValue(2);
    db.address.updateMany.mockResolvedValue({});
    db.address.create.mockResolvedValue({ id: "addr-3" });
    await service.create(USER, {
      recipientName: "A",
      recipientPhone: "0900000000",
      addressLine: "X",
      isDefault: true,
    });
    expect(db.address.updateMany).toHaveBeenCalledWith({
      where: { userId: USER, isDefault: true },
      data: { isDefault: false },
    });
    expect(db.address.create.mock.calls[0]![0].data.isDefault).toBe(true);
  });

  it("gán đúng userId từ tham số (không tin userId từ body)", async () => {
    db.address.count.mockResolvedValue(0);
    db.address.create.mockResolvedValue({ id: "addr-1" });
    await service.create(USER, {
      recipientName: "A",
      recipientPhone: "0900000000",
      addressLine: "X",
    });
    expect(db.address.create.mock.calls[0]![0].data.userId).toBe(USER);
  });
});

describe("update", () => {
  it("404 khi địa chỉ không tồn tại HOẶC không thuộc user đang đăng nhập (chống IDOR)", async () => {
    db.address.findFirst.mockResolvedValue(null);
    await expect(service.update(USER, "addr-x", { recipientName: "B" })).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
    expect(db.address.update).not.toHaveBeenCalled();
  });

  it("ownership check lọc CẢ id LẪN userId trong where — không chỉ id", async () => {
    db.address.findFirst.mockResolvedValue({ id: "addr-1", userId: USER });
    db.address.update.mockResolvedValue({ id: "addr-1" });
    await service.update(USER, "addr-1", { recipientName: "B" });
    expect(db.address.findFirst.mock.calls[0]![0].where).toEqual({ id: "addr-1", userId: USER });
  });

  it("đặt isDefault: true → unset địa chỉ mặc định KHÁC của CÙNG user (loại trừ chính nó)", async () => {
    db.address.findFirst.mockResolvedValue({ id: "addr-1", userId: USER });
    db.address.updateMany.mockResolvedValue({});
    db.address.update.mockResolvedValue({ id: "addr-1" });
    await service.update(USER, "addr-1", { isDefault: true });
    expect(db.address.updateMany).toHaveBeenCalledWith({
      where: { userId: USER, isDefault: true, id: { not: "addr-1" } },
      data: { isDefault: false },
    });
  });

  it("không truyền field nào thì KHÔNG đụng field đó (chỉ cập nhật field có mặt)", async () => {
    db.address.findFirst.mockResolvedValue({ id: "addr-1", userId: USER });
    db.address.update.mockResolvedValue({ id: "addr-1" });
    await service.update(USER, "addr-1", { recipientName: "B" });
    expect(db.address.update.mock.calls[0]![0].data).toEqual({ recipientName: "B" });
  });
});

describe("remove", () => {
  it("404 khi địa chỉ không tồn tại HOẶC không thuộc user đang đăng nhập", async () => {
    db.address.findFirst.mockResolvedValue(null);
    await expect(service.remove(USER, "addr-x")).rejects.toMatchObject({ statusCode: 404 });
    expect(db.address.delete).not.toHaveBeenCalled();
  });

  it("xoá được địa chỉ của chính mình, KHÔNG tự đôn địa chỉ khác lên mặc định", async () => {
    db.address.findFirst.mockResolvedValue({ id: "addr-1", userId: USER });
    db.address.delete.mockResolvedValue({});
    await service.remove(USER, "addr-1");
    expect(db.address.delete).toHaveBeenCalledWith({ where: { id: "addr-1" } });
    expect(db.address.updateMany).not.toHaveBeenCalled();
  });
});

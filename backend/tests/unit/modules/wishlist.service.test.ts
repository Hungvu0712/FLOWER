import { beforeEach, describe, expect, it } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as service from "@/modules/domain/wishlist/wishlist.service";

const USER = "user-1";

beforeEach(() => {
  resetPrismaMock();
});

describe("list — row-level check (docs/12 §5.1)", () => {
  it("chỉ truy vấn wishlist của ĐÚNG user đang đăng nhập", async () => {
    db.wishlist.findMany.mockResolvedValue([]);
    await service.list(USER);
    expect(db.wishlist.findMany.mock.calls[0]![0].where).toEqual({
      userId: USER,
      product: { deletedAt: null },
    });
  });

  it("làm phẳng { product: {...} } thành sản phẩm trực tiếp kèm savedAt", async () => {
    const createdAt = new Date("2026-01-01");
    db.wishlist.findMany.mockResolvedValue([
      { productId: "p1", createdAt, product: { id: "p1", name: "Hoa hồng" } },
    ]);
    const result = await service.list(USER);
    expect(result).toEqual([{ id: "p1", name: "Hoa hồng", savedAt: createdAt }]);
  });
});

describe("add", () => {
  it("404 PRODUCT_NOT_FOUND khi sản phẩm không tồn tại hoặc đã xoá mềm", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.add(USER, "p-khong-co")).rejects.toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  });

  it("thêm mới khi chưa có trong wishlist", async () => {
    db.product.findFirst.mockResolvedValue({ id: "p1" });
    db.wishlist.findUnique.mockResolvedValue(null);
    db.wishlist.create.mockResolvedValue({ userId: USER, productId: "p1" });
    await service.add(USER, "p1");
    expect(db.wishlist.create).toHaveBeenCalledWith({
      data: { userId: USER, productId: "p1" },
    });
  });

  it("idempotent — thêm sản phẩm ĐÃ CÓ trong wishlist không tạo dòng mới, không báo lỗi", async () => {
    db.product.findFirst.mockResolvedValue({ id: "p1" });
    db.wishlist.findUnique.mockResolvedValue({ userId: USER, productId: "p1" });
    const result = await service.add(USER, "p1");
    expect(db.wishlist.create).not.toHaveBeenCalled();
    expect(result).toEqual({ userId: USER, productId: "p1" });
  });
});

describe("remove", () => {
  it("idempotent — xoá kể cả khi chưa từng có trong wishlist, không báo lỗi", async () => {
    db.wishlist.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.remove(USER, "p-khong-co")).resolves.toBeUndefined();
  });

  it("lọc ĐÚNG userId + productId — không xoá nhầm wishlist của user khác", async () => {
    db.wishlist.deleteMany.mockResolvedValue({ count: 1 });
    await service.remove(USER, "p1");
    expect(db.wishlist.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER, productId: "p1" },
    });
  });
});

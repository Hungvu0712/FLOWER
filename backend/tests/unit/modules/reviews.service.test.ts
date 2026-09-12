import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/reviews/reviews.service";

const USER = "user-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("listPublic — storefront", () => {
  it("CHỈ lấy đánh giá ĐÃ DUYỆT của đúng 1 sản phẩm", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listPublic({ productId: "p1", page: 1, limit: 10 } as never);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({
      productId: "p1",
      isApproved: true,
    });
  });

  it("KHÔNG lộ trường nội bộ (isApproved, productId, updatedAt) ra API công khai", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listPublic({ productId: "p1", page: 1, limit: 10 } as never);
    const select = db.review.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("isApproved");
    expect(select).not.toHaveProperty("productId");
    expect(select).not.toHaveProperty("updatedAt");
  });
});

describe("create", () => {
  it("404 PRODUCT_NOT_FOUND khi sản phẩm không tồn tại hoặc đã xoá mềm", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(
      service.create(USER, { productId: "p-khong-co", rating: 5 } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "PRODUCT_NOT_FOUND" });
  });

  it("409 REVIEW_ALREADY_EXISTS khi user đã đánh giá sản phẩm này rồi", async () => {
    db.product.findFirst.mockResolvedValue({ id: "p1" });
    db.review.findUnique.mockResolvedValue({ id: "r-cu" });
    await expect(
      service.create(USER, { productId: "p1", rating: 5 } as never),
    ).rejects.toMatchObject({ statusCode: 409, code: "REVIEW_ALREADY_EXISTS" });
    expect(db.review.create).not.toHaveBeenCalled();
  });

  it("mặc định isApproved: false — chờ duyệt, KHÔNG hiện công khai ngay", async () => {
    db.product.findFirst.mockResolvedValue({ id: "p1" });
    db.review.findUnique.mockResolvedValue(null);
    db.review.create.mockResolvedValue({ id: "r1", isApproved: false });
    await service.create(USER, { productId: "p1", rating: 4, comment: "Đẹp" } as never);
    expect(db.review.create.mock.calls[0]![0].data).toMatchObject({
      productId: "p1",
      userId: USER,
      rating: 4,
      comment: "Đẹp",
      isApproved: false,
    });
  });

  it("ghi audit log khi tạo đánh giá", async () => {
    db.product.findFirst.mockResolvedValue({ id: "p1" });
    db.review.findUnique.mockResolvedValue(null);
    db.review.create.mockResolvedValue({ id: "r1" });
    await service.create(USER, { productId: "p1", rating: 5 } as never);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "review.create", entityType: "review" }),
    );
  });
});

describe("listOwn — row-level check (docs/12 §5.1)", () => {
  it("chỉ truy vấn đánh giá của ĐÚNG user đang đăng nhập", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listOwn(USER, { page: 1, limit: 10 } as never);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({ userId: USER });
  });
});

describe("listAdmin — hàng đợi duyệt", () => {
  it("mặc định lấy CẢ chờ duyệt lẫn đã duyệt (không lọc isApproved)", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listAdmin({ page: 1, limit: 24 } as never);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({});
  });

  it("lọc isApproved=false khi cần chỉ xem hàng đợi chờ duyệt", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listAdmin({ isApproved: false, page: 1, limit: 24 } as never);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({ isApproved: false });
  });

  it("lọc theo productId khi có truyền", async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await service.listAdmin({ productId: "p1", page: 1, limit: 24 } as never);
    expect(db.review.findMany.mock.calls[0]![0].where).toEqual({ productId: "p1" });
  });
});

describe("moderate", () => {
  it("404 khi đánh giá không tồn tại", async () => {
    db.review.findUnique.mockResolvedValue(null);
    await expect(service.moderate(USER, "r-khong-co", true)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("duyệt thành công (isApproved: false → true) và ghi audit log", async () => {
    db.review.findUnique.mockResolvedValue({ id: "r1", isApproved: false });
    db.review.update.mockResolvedValue({ id: "r1", isApproved: true });
    await service.moderate(USER, "r1", true);
    expect(db.review.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { isApproved: true },
      select: expect.any(Object),
    });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "review.moderate",
        before: { isApproved: false },
        after: { isApproved: true },
      }),
    );
  });
});

describe("remove", () => {
  it("404 khi đánh giá không tồn tại", async () => {
    db.review.findUnique.mockResolvedValue(null);
    await expect(service.remove(USER, "r-khong-co")).rejects.toMatchObject({ statusCode: 404 });
    expect(db.review.delete).not.toHaveBeenCalled();
  });

  it("xoá thành công và ghi audit log", async () => {
    db.review.findUnique.mockResolvedValue({ id: "r1" });
    db.review.delete.mockResolvedValue({});
    await service.remove(USER, "r1");
    expect(db.review.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "review.delete", entityType: "review" }),
    );
  });
});

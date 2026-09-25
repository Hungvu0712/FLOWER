import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/coupons/coupons.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
});

describe("computeDiscount", () => {
  it("percent — giảm theo % của subtotal, làm tròn xuống", () => {
    expect(service.computeDiscount({ type: "percent", value: 10 }, 99999)).toBe(9999);
  });

  it("fixed — giảm đúng số tiền cố định", () => {
    expect(service.computeDiscount({ type: "fixed", value: 20000 }, 100000)).toBe(20000);
  });

  it("fixed — KHÔNG BAO GIỜ giảm vượt subtotal (đơn nhỏ hơn giá trị mã)", () => {
    expect(service.computeDiscount({ type: "fixed", value: 50000 }, 30000)).toBe(30000);
  });

  it("percent — chốt an toàn cuối cùng, KHÔNG BAO GIỜ giảm vượt subtotal dù value > 100 lọt vào DB (review VAL-01)", () => {
    expect(service.computeDiscount({ type: "percent", value: 500 }, 100000)).toBe(100000);
  });
});

describe("checkCoupon / validate", () => {
  it("404 COUPON_NOT_FOUND khi mã không tồn tại", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    await expect(service.checkCoupon("KHONGTONTAI", 100000)).rejects.toMatchObject({
      statusCode: 404,
      code: "COUPON_NOT_FOUND",
    });
  });

  it("chuẩn hoá mã về HOA + trim trước khi tra DB (khách gõ thường/có khoảng trắng vẫn khớp)", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    });
    await service.checkCoupon("  sale10  ", 100000);
    expect(db.coupon.findUnique).toHaveBeenCalledWith({ where: { code: "SALE10" } });
  });

  it("409 COUPON_INACTIVE khi mã đã bị tạm ngưng", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      isActive: false,
    });
    await expect(service.checkCoupon("SALE10", 100000)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_INACTIVE",
    });
  });

  it("409 COUPON_NOT_STARTED khi chưa tới ngày bắt đầu", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: tomorrow,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    });
    await expect(service.checkCoupon("SALE10", 100000)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_NOT_STARTED",
    });
  });

  it("409 COUPON_EXPIRED khi đã qua ngày kết thúc", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: null,
      endDate: yesterday,
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    });
    await expect(service.checkCoupon("SALE10", 100000)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_EXPIRED",
    });
  });

  it("409 COUPON_USAGE_LIMIT_REACHED khi đã dùng hết lượt", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: null,
      endDate: null,
      usageLimit: 5,
      usedCount: 5,
      isActive: true,
    });
    await expect(service.checkCoupon("SALE10", 100000)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_USAGE_LIMIT_REACHED",
    });
  });

  it("409 COUPON_MIN_ORDER_NOT_MET khi subtotal dưới đơn tối thiểu", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: 200000,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    });
    await expect(service.checkCoupon("SALE10", 100000)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_MIN_ORDER_NOT_MET",
    });
  });

  it("hợp lệ — trả về discountAmount tính đúng, KHÔNG tự tăng usedCount", async () => {
    db.coupon.findUnique.mockResolvedValue({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
      minOrderValue: null,
      startDate: null,
      endDate: null,
      usageLimit: null,
      usedCount: 0,
      isActive: true,
    });
    const result = await service.validate({ code: "SALE10", subtotal: 100000 });
    expect(result).toEqual({ code: "SALE10", type: "percent", value: 10, discountAmount: 10000 });
    expect(db.coupon.update).not.toHaveBeenCalled();
  });
});

describe("listAdmin", () => {
  it("mặc định CHỈ lấy mã đang hoạt động (isActive: true)", async () => {
    db.coupon.findMany.mockResolvedValue([]);
    db.coupon.count.mockResolvedValue(0);
    await service.listAdmin({ page: 1, limit: 24 } as never);
    expect(db.coupon.findMany.mock.calls[0]![0].where).toEqual({ isActive: true });
  });

  it("includeInactive=true → lấy CẢ mã đã tạm ngưng", async () => {
    db.coupon.findMany.mockResolvedValue([]);
    db.coupon.count.mockResolvedValue(0);
    await service.listAdmin({ includeInactive: true, page: 1, limit: 24 } as never);
    expect(db.coupon.findMany.mock.calls[0]![0].where).toEqual({});
  });
});

describe("create", () => {
  it("409 COUPON_CODE_EXISTS khi mã đã tồn tại", async () => {
    db.coupon.findUnique.mockResolvedValue({ id: "c-cu" });
    await expect(
      service.create(ACTOR, { code: "SALE10", type: "percent", value: 10 } as never),
    ).rejects.toMatchObject({ statusCode: 409, code: "COUPON_CODE_EXISTS" });
    expect(db.coupon.create).not.toHaveBeenCalled();
  });

  it("tạo thành công, lưu mã ở dạng HOA, và ghi audit log", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    db.coupon.create.mockResolvedValue({ id: "c1", code: "SALE10" });
    await service.create(ACTOR, { code: "sale10", type: "percent", value: 10 } as never);
    expect(db.coupon.create.mock.calls[0]![0].data).toMatchObject({ code: "SALE10" });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "coupon.create", entityType: "coupon" }),
    );
  });
});

describe("update", () => {
  it("404 khi mã không tồn tại", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    await expect(service.update(ACTOR, "c-khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("409 COUPON_CODE_EXISTS khi đổi sang mã đã dùng bởi coupon KHÁC", async () => {
    db.coupon.findUnique
      .mockResolvedValueOnce({ id: "c1", code: "SALE10" }) // load before
      .mockResolvedValueOnce({ id: "c2", code: "SALE20" }); // tra trùng mã mới
    await expect(service.update(ACTOR, "c1", { code: "SALE20" } as never)).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_CODE_EXISTS",
    });
  });

  it("cho phép giữ NGUYÊN mã của chính mình (không tự đụng 409 với bản thân)", async () => {
    db.coupon.findUnique
      .mockResolvedValueOnce({ id: "c1", code: "SALE10" })
      .mockResolvedValueOnce({ id: "c1", code: "SALE10" });
    db.coupon.update.mockResolvedValue({ id: "c1", code: "SALE10" });
    await service.update(ACTOR, "c1", { code: "SALE10", isActive: false } as never);
    expect(db.coupon.update).toHaveBeenCalled();
  });

  it("422 khi PATCH {value: 500} lên mã ĐANG là percent mà không gửi kèm type (review VAL-01)", async () => {
    // Mã hiện có trong DB: type percent. Request chỉ gửi value — zod ở route không biết record hiện
    // tại, phải validate lại ở service theo BẢN GHI SAU KHI MERGE.
    db.coupon.findUnique.mockResolvedValueOnce({
      id: "c1",
      code: "SALE10",
      type: "percent",
      value: 10,
    });
    await expect(service.update(ACTOR, "c1", { value: 500 } as never)).rejects.toMatchObject({
      statusCode: 422,
      code: "VALIDATION_ERROR",
    });
    expect(db.coupon.update).not.toHaveBeenCalled();
  });

  it("422 khi đổi type sang percent kèm value > 100 trong CÙNG request", async () => {
    db.coupon.findUnique.mockResolvedValueOnce({
      id: "c1",
      code: "SALE10",
      type: "fixed",
      value: 20000,
    });
    await expect(
      service.update(ACTOR, "c1", { type: "percent", value: 200 } as never),
    ).rejects.toMatchObject({ statusCode: 422, code: "VALIDATION_ERROR" });
  });

  it("value ≤ 100 kèm type percent có sẵn vẫn cập nhật bình thường", async () => {
    db.coupon.findUnique
      .mockResolvedValueOnce({ id: "c1", code: "SALE10", type: "percent", value: 10 })
      .mockResolvedValueOnce(null); // không đổi code -> không tra trùng
    db.coupon.update.mockResolvedValue({ id: "c1", code: "SALE10", type: "percent", value: 50 });
    await service.update(ACTOR, "c1", { value: 50 } as never);
    expect(db.coupon.update).toHaveBeenCalled();
  });

  it("đổi type sang fixed kèm value lớn (>100) vẫn hợp lệ — giới hạn 100 chỉ áp cho percent", async () => {
    db.coupon.findUnique
      .mockResolvedValueOnce({ id: "c1", code: "SALE10", type: "percent", value: 10 })
      .mockResolvedValueOnce(null);
    db.coupon.update.mockResolvedValue({ id: "c1", code: "SALE10", type: "fixed", value: 50000 });
    await service.update(ACTOR, "c1", { type: "fixed", value: 50000 } as never);
    expect(db.coupon.update).toHaveBeenCalled();
  });
});

describe("remove", () => {
  it("404 khi mã không tồn tại", async () => {
    db.coupon.findUnique.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "c-khong-co")).rejects.toMatchObject({ statusCode: 404 });
  });

  it("409 COUPON_IN_USE khi mã ĐÃ TỪNG được dùng (usedCount > 0)", async () => {
    db.coupon.findUnique.mockResolvedValue({ id: "c1", usedCount: 3 });
    await expect(service.remove(ACTOR, "c1")).rejects.toMatchObject({
      statusCode: 409,
      code: "COUPON_IN_USE",
    });
    expect(db.coupon.delete).not.toHaveBeenCalled();
  });

  it("xoá thành công khi CHƯA từng được dùng, ghi audit log", async () => {
    db.coupon.findUnique.mockResolvedValue({ id: "c1", usedCount: 0 });
    db.coupon.delete.mockResolvedValue({});
    await service.remove(ACTOR, "c1");
    expect(db.coupon.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "coupon.delete", entityType: "coupon" }),
    );
  });
});

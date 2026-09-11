import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as service from "@/modules/domain/orders/orders.service";

const VALID_INPUT = {
  items: [{ productId: "p1", quantity: 2 }],
  recipientName: "Trần Thị B",
  recipientPhone: "0900000000",
  deliveryAddress: "123 Đường Hoa, Q1",
  deliveryDate: "2999-01-01",
  deliveryTimeSlot: "sang" as const,
};

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  db.order.findUnique.mockResolvedValue(null); // generateOrderCode: mã chưa tồn tại, dừng vòng lặp ngay
  db.orderItem.createMany.mockResolvedValue({});
});

describe("create — honeypot chống bot", () => {
  it("422 INVALID_SUBMISSION khi field honeypot 'website' có giá trị, KHÔNG đụng DB sản phẩm", async () => {
    await expect(
      service.create({ ...VALID_INPUT, website: "http://spam.example" } as never, undefined),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "INVALID_SUBMISSION",
    });
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it("chỉ toàn khoảng trắng cũng bị coi là bot điền vào (không phải field thật sự rỗng)", async () => {
    await expect(
      service.create({ ...VALID_INPUT, website: "   " } as never, undefined),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: "INVALID_SUBMISSION",
    });
  });

  it("để trống (undefined) vẫn tạo đơn bình thường — người dùng thật không điền field này", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    await expect(service.create(VALID_INPUT as never, undefined)).resolves.toBeDefined();
  });
});

describe("create", () => {
  it("chốt (snapshot) tên/giá sản phẩm, tính đúng subtotal/total", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1", orderCode: "HX2609100001" });

    await service.create(VALID_INPUT as never, undefined);

    expect(db.order.create.mock.calls[0]![0].data).toMatchObject({
      subtotal: 200000,
      total: 200000,
      userId: null,
    });
    expect(db.orderItem.createMany.mock.calls[0]![0].data).toEqual([
      {
        productId: "p1",
        productName: "Hoa hồng",
        unitPrice: 100000,
        quantity: 2,
        subtotal: 200000,
        orderId: "o1",
      },
    ]);
  });

  it("gộp số lượng khi giỏ hàng có cùng 1 sản phẩm nhiều dòng", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    await service.create(
      {
        ...VALID_INPUT,
        items: [
          { productId: "p1", quantity: 2 },
          { productId: "p1", quantity: 3 },
        ],
      } as never,
      undefined,
    );

    expect(db.orderItem.createMany.mock.calls[0]![0].data).toHaveLength(1);
    expect(db.orderItem.createMany.mock.calls[0]![0].data[0]).toMatchObject({
      quantity: 5,
      subtotal: 500000,
    });
  });

  it("409 PRODUCT_UNAVAILABLE khi sản phẩm không tồn tại/đã ẩn/đã xoá (chỉ tìm isActive+deletedAt:null)", async () => {
    db.product.findMany.mockResolvedValue([]); // không khớp product nào
    await expect(service.create(VALID_INPUT as never, undefined)).rejects.toMatchObject({
      statusCode: 409,
      code: "PRODUCT_UNAVAILABLE",
    });
    expect(db.product.findMany.mock.calls[0]![0].where).toMatchObject({
      deletedAt: null,
      isActive: true,
    });
  });

  it("guest checkout (không đăng nhập) — userId null, audit log KHÔNG có actorId", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    await service.create(VALID_INPUT as never, undefined);

    expect(db.order.create.mock.calls[0]![0].data.userId).toBeNull();
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.not.objectContaining({ actorId: expect.anything() }),
    );
  });

  it("đã đăng nhập — gắn userId vào đơn và actorId vào audit log", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    await service.create(VALID_INPUT as never, "user-1");

    expect(db.order.create.mock.calls[0]![0].data.userId).toBe("user-1");
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "user-1", action: "order.create" }),
    );
  });

  it("thử lại mã đơn khi trùng (generateOrderCode) cho tới khi tìm được mã chưa dùng", async () => {
    db.product.findMany.mockResolvedValue([{ id: "p1", name: "Hoa hồng", basePrice: 100000 }]);
    db.order.findUnique
      .mockResolvedValueOnce({ id: "existing" }) // lần 1: mã trùng
      .mockResolvedValueOnce(null); // lần 2: mã trống, dùng được
    db.order.create.mockResolvedValue({ id: "o1" });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "o1" });

    await service.create(VALID_INPUT as never, undefined);

    expect(db.order.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("getById", () => {
  it("404 khi không tìm thấy đơn (dùng chung cho tra cứu công khai lẫn admin)", async () => {
    db.order.findUnique.mockResolvedValue(null);
    await expect(service.getById("khong-ton-tai")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });

  it("trả đơn kèm items khi tìm thấy", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", items: [] });
    const result = await service.getById("o1");
    expect(result).toEqual({ id: "o1", items: [] });
  });
});

describe("listOwn — row-level check cho module domain (docs/12 §5.1)", () => {
  it("CHỈ lọc theo userId — không cho truyền filter nào khác lộ ra đơn của người khác", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);
    await service.listOwn("user-1", { page: 1, limit: 24 } as never);
    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({ userId: "user-1" });
    expect(db.order.count.mock.calls[0]![0].where).toEqual({ userId: "user-1" });
  });

  it("2 khách khác nhau → truy vấn với where.userId khác nhau, không lẫn dữ liệu", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);

    await service.listOwn("user-1", { page: 1, limit: 24 } as never);
    await service.listOwn("user-2", { page: 1, limit: 24 } as never);

    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({ userId: "user-1" });
    expect(db.order.findMany.mock.calls[1]![0].where).toEqual({ userId: "user-2" });
  });

  it("sắp xếp mới nhất trước và phân trang đúng skip/take", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(50);
    const { meta } = await service.listOwn("user-1", { page: 2, limit: 10 } as never);
    expect(db.order.findMany.mock.calls[0]![0]).toMatchObject({
      orderBy: { createdAt: "desc" },
      skip: 10,
      take: 10,
    });
    expect(meta).toEqual({ page: 2, limit: 10, total: 50, totalPages: 5 });
  });
});

describe("listAdmin", () => {
  it("lọc theo status khi có truyền", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);
    await service.listAdmin({ status: "pending", page: 1, limit: 24 } as never);
    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({ status: "pending" });
  });

  it("không lọc status khi không truyền", async () => {
    db.order.findMany.mockResolvedValue([]);
    db.order.count.mockResolvedValue(0);
    await service.listAdmin({ page: 1, limit: 24 } as never);
    expect(db.order.findMany.mock.calls[0]![0].where).toEqual({});
  });
});

describe("updateStatus", () => {
  it("404 khi đơn không tồn tại", async () => {
    db.order.findUnique.mockResolvedValue(null);
    await expect(
      service.updateStatus("admin-1", "khong-co", "confirmed", ["orders.update_status"]),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("409 ORDER_STATUS_FINAL khi đơn đã hoàn tất hoặc đã huỷ", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "completed" });
    await expect(
      service.updateStatus("admin-1", "o1", "confirmed", ["orders.update_status"]),
    ).rejects.toMatchObject({ statusCode: 409, code: "ORDER_STATUS_FINAL" });
  });

  it("403 khi đổi sang trạng thái thường (không phải huỷ) mà thiếu orders.update_status", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "pending" });
    await expect(service.updateStatus("staff-1", "o1", "confirmed", [])).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("403 khi huỷ đơn mà thiếu orders.cancel — có orders.update_status vẫn KHÔNG đủ (2 quyền tách riêng theo docs/05 §2.4)", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "pending" });
    await expect(
      service.updateStatus("staff-1", "o1", "cancelled", ["orders.update_status"]),
    ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
  });

  it("409 ORDER_CANNOT_CANCEL khi đơn đang giao (delivering)", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "delivering" });
    await expect(
      service.updateStatus("staff-1", "o1", "cancelled", ["orders.cancel"]),
    ).rejects.toMatchObject({ statusCode: 409, code: "ORDER_CANNOT_CANCEL" });
  });

  it("huỷ thành công khi có orders.cancel và đơn chưa giao, ghi audit log", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "pending" });
    db.order.update.mockResolvedValue({ id: "o1", status: "cancelled" });

    const result = await service.updateStatus(
      "staff-1",
      "o1",
      "cancelled",
      ["orders.cancel"],
      "1.2.3.4",
    );

    expect(result.status).toBe("cancelled");
    expect(db.order.update.mock.calls[0]![0].data).toEqual({ status: "cancelled" });
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "staff-1",
        action: "order.update_status",
        ipAddress: "1.2.3.4",
      }),
    );
  });

  it("cập nhật trạng thái thường thành công khi có orders.update_status", async () => {
    db.order.findUnique.mockResolvedValue({ id: "o1", status: "pending" });
    db.order.update.mockResolvedValue({ id: "o1", status: "confirmed" });

    const result = await service.updateStatus("staff-1", "o1", "confirmed", [
      "orders.update_status",
    ]);
    expect(result.status).toBe("confirmed");
  });
});

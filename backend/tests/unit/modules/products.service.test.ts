import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import * as auditLog from "@/modules/core/audit-log/auditLog.service";
import * as filesService from "@/modules/core/files/files.service";
import * as service from "@/modules/domain/products/products.service";

const ACTOR = "admin-1";

beforeEach(() => {
  resetPrismaMock();
  vi.spyOn(auditLog, "record").mockResolvedValue(undefined);
  vi.spyOn(filesService, "syncEntityFiles").mockResolvedValue(undefined);
  db.product.findUniqueOrThrow.mockResolvedValue({ id: "prod-1" });
});

describe("listPublic — dữ liệu cho storefront", () => {
  it("chỉ trả sản phẩm đang bật, chưa xoá", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 24 } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({ deletedAt: null, isActive: true });
  });

  it("lọc theo categoryId khi có truyền", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 24, categoryId: "cat-1" } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({
      deletedAt: null,
      isActive: true,
      categoryId: "cat-1",
    });
  });
});

describe("list — dữ liệu cho admin", () => {
  it("mặc định chỉ lấy sản phẩm đang bật", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24 } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({ deletedAt: null, isActive: true });
  });

  it("includeInactive=true lấy cả sản phẩm đang ẩn (nhưng vẫn loại trừ đã xoá)", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24, includeInactive: true } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({ deletedAt: null });
  });

  it("phân trang đúng", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(50);
    const { meta } = await service.list({ page: 2, limit: 24 } as never);
    expect(db.product.findMany.mock.calls[0]![0]).toMatchObject({ skip: 24, take: 24 });
    expect(meta.totalPages).toBe(3);
  });
});

describe("create", () => {
  it("tự sinh slug từ tên tiếng Việt khi không truyền slug", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "Hoa Sinh Nhật", basePrice: 200000 } as never);
    expect(db.product.create.mock.calls[0]![0].data.slug).toBe("hoa-sinh-nhat");
  });

  it("thêm hậu tố -2 khi slug đã tồn tại", async () => {
    db.product.findFirst.mockResolvedValueOnce({ id: "khac" }).mockResolvedValueOnce(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "Hoa cưới", basePrice: 500000 } as never);
    expect(db.product.create.mock.calls[0]![0].data.slug).toBe("hoa-cuoi-2");
  });

  it("sanitize mô tả HTML trước khi lưu — chặn XSS lưu trữ qua ô mô tả (rich text)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, {
      name: "X",
      basePrice: 1000,
      description: '<p>Hoa <strong>đẹp</strong></p><script>alert(1)</script>',
    } as never);
    expect(db.product.create.mock.calls[0]![0].data.description).toBe("<p>Hoa <strong>đẹp</strong></p>");
  });

  it("404 CATEGORY_NOT_FOUND khi categoryId không tồn tại", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.category.findUnique.mockResolvedValue(null);
    await expect(
      service.create(ACTOR, {
        name: "X",
        basePrice: 1000,
        categoryId: "11111111-1111-1111-1111-111111111111",
      } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "CATEGORY_NOT_FOUND" });
  });

  it("giá trị mặc định: isActive = true (KHÔNG có stock — hoa tươi làm theo đơn, không lưu kho)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "X", basePrice: 1000 } as never);
    expect(db.product.create.mock.calls[0]![0].data).toMatchObject({ isActive: true });
    expect(db.product.create.mock.calls[0]![0].data).not.toHaveProperty("stock");
  });

  it("tạo bộ ảnh theo ĐÚNG thứ tự và đánh dấu file đang được dùng (chống job dọn mồ côi xoá nhầm)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    db.productImage.createMany.mockResolvedValue({});
    await service.create(ACTOR, {
      name: "X",
      basePrice: 1000,
      imageFileIds: ["file-a", "file-b"],
    } as never);

    expect(db.productImage.createMany.mock.calls[0]![0].data).toEqual([
      { productId: "prod-1", fileId: "file-a", sortOrder: 0 },
      { productId: "prod-1", fileId: "file-b", sortOrder: 1 },
    ]);
    expect(filesService.syncEntityFiles).toHaveBeenCalledWith({
      fileIds: ["file-a", "file-b"],
      entityType: "product_image",
      entityId: "prod-1",
    });
  });

  it("không truyền imageFileIds thì KHÔNG đụng vào bộ ảnh (undefined ≠ mảng rỗng)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "X", basePrice: 1000 } as never);
    expect(db.productImage.deleteMany).not.toHaveBeenCalled();
    expect(filesService.syncEntityFiles).not.toHaveBeenCalled();
  });
});

describe("update", () => {
  it("sanitize mô tả HTML trước khi lưu (giống create)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", { description: '<p onclick="x()">A</p><img src=x>' } as never);
    expect(db.product.update.mock.calls[0]![0].data.description).toBe("<p>A</p>");
  });

  it("đổi TÊN không tự đổi slug (tránh gãy link đã chia sẻ)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", { name: "Hoa cưới cao cấp" } as never);
    expect(db.product.update.mock.calls[0]![0].data).not.toHaveProperty("slug");
  });

  it("chỉ đổi slug khi người dùng chủ động sửa slug", async () => {
    db.product.findFirst.mockResolvedValueOnce({ id: "prod-1", slug: "hoa-cuoi" }).mockResolvedValueOnce(null);
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", { slug: "Hoa Cưới Cao Cấp" } as never);
    expect(db.product.update.mock.calls[0]![0].data.slug).toBe("hoa-cuoi-cao-cap");
  });

  it("404 khi sản phẩm không tồn tại hoặc đã xoá mềm", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("gửi lại imageFileIds là THAY THẾ toàn bộ bộ ảnh cũ, không phải thêm vào", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productImage.deleteMany.mockResolvedValue({});
    db.productImage.createMany.mockResolvedValue({});
    await service.update(ACTOR, "prod-1", { imageFileIds: ["file-c"] } as never);
    expect(db.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(filesService.syncEntityFiles).toHaveBeenCalledWith({
      fileIds: ["file-c"],
      entityType: "product_image",
      entityId: "prod-1",
    });
  });

  it("gửi imageFileIds RỖNG xoá hết ảnh (khác undefined — không đụng gì)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productImage.deleteMany.mockResolvedValue({});
    await service.update(ACTOR, "prod-1", { imageFileIds: [] } as never);
    expect(db.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(db.productImage.createMany).not.toHaveBeenCalled();
    expect(filesService.syncEntityFiles).toHaveBeenCalledWith({
      fileIds: [],
      entityType: "product_image",
      entityId: "prod-1",
    });
  });
});

describe("remove — soft delete", () => {
  it("đánh dấu deletedAt + isActive:false, KHÔNG xoá cứng bản ghi (order_items sẽ tham chiếu sau)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1" });
    db.product.update.mockResolvedValue({});
    await service.remove(ACTOR, "prod-1", "1.2.3.4");
    expect(db.product.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { deletedAt: expect.any(Date), isActive: false },
    });
    expect(db.product.delete).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "product.delete", entityType: "product", ipAddress: "1.2.3.4" }),
    );
  });

  it("404 khi sản phẩm không tồn tại hoặc đã xoá trước đó", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "prod-1")).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});

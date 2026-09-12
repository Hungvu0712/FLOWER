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
  db.product.findUniqueOrThrow.mockResolvedValue({ id: "prod-1", occasions: [] });
});

describe("listPublic — dữ liệu cho storefront", () => {
  it("chỉ trả sản phẩm đang bật, chưa xoá", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 24 } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({
      deletedAt: null,
      isActive: true,
    });
  });

  it("KHÔNG lộ trường nội bộ (isActive, createdAt, updatedAt, categoryId dư thừa) ra API công khai", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 24 } as never);
    const select = db.product.findMany.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("isActive");
    expect(select).not.toHaveProperty("createdAt");
    expect(select).not.toHaveProperty("updatedAt");
    expect(select).not.toHaveProperty("categoryId");
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

  it("lọc theo occasionId khi có truyền (n-n qua product_occasions)", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.listPublic({ page: 1, limit: 24, occasionId: "occ-1" } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({
      deletedAt: null,
      isActive: true,
      occasions: { some: { occasionId: "occ-1" } },
    });
  });

  it("làm phẳng occasions từ { occasion: {...} }[] thành {...}[] cho từng sản phẩm", async () => {
    db.product.findMany.mockResolvedValue([
      {
        id: "prod-1",
        occasions: [{ occasion: { id: "occ-1", name: "Sinh nhật", slug: "sinh-nhat" } }],
      },
    ]);
    db.product.count.mockResolvedValue(1);
    const { items } = await service.listPublic({ page: 1, limit: 24 } as never);
    expect(items[0]!.occasions).toEqual([{ id: "occ-1", name: "Sinh nhật", slug: "sinh-nhat" }]);
  });
});

describe("getPublicBySlug — trang chi tiết sản phẩm", () => {
  it("chỉ tìm sản phẩm đang bật, chưa xoá theo slug", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi", occasions: [] });
    await service.getPublicBySlug("hoa-cuoi");
    expect(db.product.findFirst.mock.calls[0]![0].where).toEqual({
      slug: "hoa-cuoi",
      deletedAt: null,
      isActive: true,
    });
  });

  it("KHÔNG lộ trường nội bộ, giống listPublic()", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi", occasions: [] });
    await service.getPublicBySlug("hoa-cuoi");
    const select = db.product.findFirst.mock.calls[0]![0].select;
    expect(select).not.toHaveProperty("isActive");
    expect(select).not.toHaveProperty("createdAt");
    expect(select).not.toHaveProperty("updatedAt");
    expect(select).not.toHaveProperty("categoryId");
  });

  it("404 khi không tìm thấy slug (hoặc sản phẩm đã ẩn/xoá)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.getPublicBySlug("khong-ton-tai")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});

describe("list — dữ liệu cho admin", () => {
  it("mặc định chỉ lấy sản phẩm đang bật", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24 } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({
      deletedAt: null,
      isActive: true,
    });
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

  it("lọc theo occasionId khi có truyền", async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await service.list({ page: 1, limit: 24, occasionId: "occ-1" } as never);
    expect(db.product.findMany.mock.calls[0]![0].where).toEqual({
      deletedAt: null,
      isActive: true,
      occasions: { some: { occasionId: "occ-1" } },
    });
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
      description: "<p>Hoa <strong>đẹp</strong></p><script>alert(1)</script>",
    } as never);
    expect(db.product.create.mock.calls[0]![0].data.description).toBe(
      "<p>Hoa <strong>đẹp</strong></p>",
    );
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

  it("tạo biến thể theo ĐÚNG thứ tự (Nhỏ/Vừa/Lớn) khi tạo sản phẩm kèm variants", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    db.productVariant.findMany.mockResolvedValue([]); // chưa có biến thể nào (sản phẩm mới)
    await service.create(ACTOR, {
      name: "X",
      basePrice: 1000,
      variants: [
        { name: "Nhỏ", price: 200000 },
        { name: "Vừa", price: 300000 },
        { name: "Lớn", price: 400000 },
      ],
    } as never);

    expect(db.productVariant.create).toHaveBeenCalledTimes(3);
    expect(db.productVariant.create.mock.calls[0]![0].data).toMatchObject({
      productId: "prod-1",
      name: "Nhỏ",
      price: 200000,
      sortOrder: 0,
    });
    expect(db.productVariant.create.mock.calls[2]![0].data).toMatchObject({ sortOrder: 2 });
  });

  it("không truyền variants thì KHÔNG đụng vào bộ biến thể (undefined ≠ mảng rỗng)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "X", basePrice: 1000 } as never);
    expect(db.productVariant.findMany).not.toHaveBeenCalled();
    expect(db.productVariant.deleteMany).not.toHaveBeenCalled();
  });

  it("gắn dịp lễ khi tạo sản phẩm kèm occasionIds hợp lệ", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    db.occasion.findMany.mockResolvedValue([{ id: "occ-1" }, { id: "occ-2" }]);
    db.productOccasion.createMany.mockResolvedValue({});
    await service.create(ACTOR, {
      name: "X",
      basePrice: 1000,
      occasionIds: ["occ-1", "occ-2"],
    } as never);

    expect(db.productOccasion.createMany.mock.calls[0]![0].data).toEqual([
      { productId: "prod-1", occasionId: "occ-1" },
      { productId: "prod-1", occasionId: "occ-2" },
    ]);
  });

  it("404 OCCASION_NOT_FOUND khi có occasionId không tồn tại — KHÔNG xoá tag cũ trước khi validate", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    db.occasion.findMany.mockResolvedValue([{ id: "occ-1" }]); // thiếu occ-2
    await expect(
      service.create(ACTOR, {
        name: "X",
        basePrice: 1000,
        occasionIds: ["occ-1", "occ-2"],
      } as never),
    ).rejects.toMatchObject({ statusCode: 404, code: "OCCASION_NOT_FOUND" });
    expect(db.productOccasion.deleteMany).not.toHaveBeenCalled();
  });

  it("không truyền occasionIds thì KHÔNG đụng vào tag hiện có (undefined ≠ mảng rỗng)", async () => {
    db.product.findFirst.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: "prod-1" });
    await service.create(ACTOR, { name: "X", basePrice: 1000 } as never);
    expect(db.occasion.findMany).not.toHaveBeenCalled();
    expect(db.productOccasion.deleteMany).not.toHaveBeenCalled();
  });
});

describe("update", () => {
  it("sanitize mô tả HTML trước khi lưu (giống create)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", {
      description: '<p onclick="x()">A</p><img src=x>',
    } as never);
    expect(db.product.update.mock.calls[0]![0].data.description).toBe("<p>A</p>");
  });

  it("đổi TÊN không tự đổi slug (tránh gãy link đã chia sẻ)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", { name: "Hoa cưới cao cấp" } as never);
    expect(db.product.update.mock.calls[0]![0].data).not.toHaveProperty("slug");
  });

  it("chỉ đổi slug khi người dùng chủ động sửa slug", async () => {
    db.product.findFirst
      .mockResolvedValueOnce({ id: "prod-1", slug: "hoa-cuoi" })
      .mockResolvedValueOnce(null);
    db.product.update.mockResolvedValue({ id: "prod-1" });
    await service.update(ACTOR, "prod-1", { slug: "Hoa Cưới Cao Cấp" } as never);
    expect(db.product.update.mock.calls[0]![0].data.slug).toBe("hoa-cuoi-cao-cap");
  });

  it("404 khi sản phẩm không tồn tại hoặc đã xoá mềm", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.update(ACTOR, "khong-co", {} as never)).rejects.toMatchObject({
      statusCode: 404,
    });
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

  it("biến thể có `id` khớp biến thể hiện có → UPDATE tại chỗ, KHÔNG tạo bản ghi mới (giữ nguyên id cho order_items đã tham chiếu)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productVariant.findMany.mockResolvedValue([{ id: "variant-1" }]);
    db.productVariant.update.mockResolvedValue({});

    await service.update(ACTOR, "prod-1", {
      variants: [{ id: "variant-1", name: "Nhỏ (đổi tên)", price: 250000 }],
    } as never);

    expect(db.productVariant.update).toHaveBeenCalledWith({
      where: { id: "variant-1" },
      data: { name: "Nhỏ (đổi tên)", price: 250000, sortOrder: 0 },
    });
    expect(db.productVariant.create).not.toHaveBeenCalled();
  });

  it("biến thể cũ KHÔNG còn trong danh sách mới gửi lên → bị xoá", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productVariant.findMany.mockResolvedValue([{ id: "variant-cu" }]);

    await service.update(ACTOR, "prod-1", { variants: [{ name: "Mới", price: 100000 }] } as never);

    expect(db.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod-1", id: { notIn: [] } },
    });
    expect(db.productVariant.create).toHaveBeenCalledWith({
      data: { productId: "prod-1", name: "Mới", price: 100000, sortOrder: 0 },
    });
  });

  it("`id` gửi lên KHÔNG thuộc sản phẩm này (lạ/của sản phẩm khác) → coi như tạo mới, không update nhầm", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productVariant.findMany.mockResolvedValue([{ id: "variant-that-cua-prod-1" }]);

    await service.update(ACTOR, "prod-1", {
      variants: [{ id: "id-la-tu-san-pham-khac", name: "X", price: 100000 }],
    } as never);

    expect(db.productVariant.update).not.toHaveBeenCalled();
    expect(db.productVariant.create).toHaveBeenCalledWith({
      data: { productId: "prod-1", name: "X", price: 100000, sortOrder: 0 },
    });
  });

  it("gửi variants RỖNG xoá hết biến thể (khác undefined — không đụng gì)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productVariant.findMany.mockResolvedValue([{ id: "variant-1" }]);

    await service.update(ACTOR, "prod-1", { variants: [] } as never);

    expect(db.productVariant.deleteMany).toHaveBeenCalledWith({
      where: { productId: "prod-1", id: { notIn: [] } },
    });
    expect(db.productVariant.create).not.toHaveBeenCalled();
  });

  it("gửi lại occasionIds là THAY THẾ toàn bộ (xoá hết rồi gắn lại theo danh sách mới)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.occasion.findMany.mockResolvedValue([{ id: "occ-3" }]);
    db.productOccasion.deleteMany.mockResolvedValue({});
    db.productOccasion.createMany.mockResolvedValue({});

    await service.update(ACTOR, "prod-1", { occasionIds: ["occ-3"] } as never);

    expect(db.productOccasion.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(db.productOccasion.createMany.mock.calls[0]![0].data).toEqual([
      { productId: "prod-1", occasionId: "occ-3" },
    ]);
  });

  it("gửi occasionIds RỖNG gỡ hết tag (khác undefined — không đụng gì)", async () => {
    db.product.findFirst.mockResolvedValue({ id: "prod-1", slug: "hoa-cuoi" });
    db.product.update.mockResolvedValue({ id: "prod-1" });
    db.productOccasion.deleteMany.mockResolvedValue({});

    await service.update(ACTOR, "prod-1", { occasionIds: [] } as never);

    expect(db.productOccasion.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
    expect(db.productOccasion.createMany).not.toHaveBeenCalled();
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
      expect.objectContaining({
        action: "product.delete",
        entityType: "product",
        ipAddress: "1.2.3.4",
      }),
    );
  });

  it("404 khi sản phẩm không tồn tại hoặc đã xoá trước đó", async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(service.remove(ACTOR, "prod-1")).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});

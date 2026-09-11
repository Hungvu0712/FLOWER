import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { slugify } from "../../../shared/utils/slugify";
import { sanitizeDescriptionHtml } from "../../../shared/utils/sanitizeHtml";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as filesService from "../../core/files/files.service";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
} from "./products.validation";

// entityType dùng cho file_usages — mỗi ảnh trong bộ sưu tập là 1 usage riêng, cùng entityId (id sản
// phẩm). Xem filesService.syncEntityFiles và bảng file_usages ở docs/05 §3.3.
const PRODUCT_IMAGE_ENTITY_TYPE = "product_image";

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  categoryId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true, file: { select: { id: true, url: true } } },
  },
} as const;

// Dùng cho storefront (public) — KHÔNG lộ isActive/createdAt/updatedAt/categoryId (nội bộ, và
// categoryId dư thừa vì đã có object `category`), giống đúng cách categories.service.ts tách
// CATEGORY_SELECT (admin) khỏi select riêng cho listPublic().
const PRODUCT_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePrice: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true, file: { select: { id: true, url: true } } },
  },
} as const;

// Tự thêm hậu tố -2, -3... nếu slug đã tồn tại — giống categories.service.ts (mỗi module domain tự
// giữ bản riêng, không tách chung — xem README.md về triết lý core vs domain của source base này).
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (
    await prisma.product.findFirst({
      where: { slug, deletedAt: null, ...(excludeId && { id: { not: excludeId } }) },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

async function replaceImages(productId: string, imageFileIds: string[] | undefined): Promise<void> {
  if (imageFileIds === undefined) return;

  await prisma.productImage.deleteMany({ where: { productId } });
  if (imageFileIds.length > 0) {
    await prisma.productImage.createMany({
      data: imageFileIds.map((fileId, index) => ({ productId, fileId, sortOrder: index })),
    });
  }
  await filesService.syncEntityFiles({
    fileIds: imageFileIds,
    entityType: PRODUCT_IMAGE_ENTITY_TYPE,
    entityId: productId,
  });
}

export async function list({ includeInactive, categoryId, page, limit }: ListProductsQuery) {
  const where = {
    deletedAt: null,
    ...(includeInactive ? {} : { isActive: true }),
    ...(categoryId && { categoryId }),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: PRODUCT_SELECT,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Dùng cho storefront (public) — luôn isActive + chưa xoá, không có includeInactive.
export async function listPublic({ categoryId, page, limit }: ListProductsQuery) {
  const where = { deletedAt: null, isActive: true, ...(categoryId && { categoryId }) };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: PRODUCT_PUBLIC_SELECT,
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

// Dùng cho trang chi tiết sản phẩm (storefront) — luôn isActive + chưa xoá, giống listPublic(). Cần
// endpoint riêng (không tận dụng listPublic rồi lọc ở FE như categories) vì danh sách sản phẩm có
// phân trang, không thể tải hết để tìm 1 slug — xem docs/modules/domain-products.md.
export async function getPublicBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    select: PRODUCT_PUBLIC_SELECT,
  });
  if (!product) throw new AppError("Sản phẩm không tồn tại", 404, "NOT_FOUND");
  return product;
}

export async function create(actorId: string, input: CreateProductInput, ipAddress?: string) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.name));

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError("Danh mục không tồn tại", 404, "CATEGORY_NOT_FOUND");
  }

  const product = await prisma.product.create({
    data: {
      name: input.name,
      slug,
      description:
        input.description !== undefined ? sanitizeDescriptionHtml(input.description) : undefined,
      basePrice: input.basePrice,
      categoryId: input.categoryId ?? null,
      isActive: input.isActive ?? true,
    },
  });

  await replaceImages(product.id, input.imageFileIds);

  const full = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    select: PRODUCT_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    after: full,
    ...(ipAddress && { ipAddress }),
  });
  return full;
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateProductInput,
  ipAddress?: string,
) {
  const before = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new AppError("Sản phẩm không tồn tại", 404, "NOT_FOUND");

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new AppError("Danh mục không tồn tại", 404, "CATEGORY_NOT_FOUND");
  }

  // Đổi tên KHÔNG tự đổi slug (tránh gãy link đã chia sẻ) — chỉ đổi khi người dùng chủ động sửa slug.
  const slug =
    input.slug !== undefined ? await ensureUniqueSlug(slugify(input.slug), id) : undefined;

  await prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.description !== undefined && {
        description: sanitizeDescriptionHtml(input.description),
      }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });

  await replaceImages(id, input.imageFileIds);

  const full = await prisma.product.findUniqueOrThrow({ where: { id }, select: PRODUCT_SELECT });

  await auditLog.record({
    actorId,
    action: "product.update",
    entityType: "product",
    entityId: id,
    before,
    after: full,
    ...(ipAddress && { ipAddress }),
  });
  return full;
}

// Soft delete — KHÁC categories (hard delete): sản phẩm sẽ được order_items tham chiếu sau này, đơn
// hàng cũ vẫn phải hiển thị đúng tên/giá sản phẩm dù sản phẩm đã ngừng bán (xem schema.prisma). Ảnh
// sản phẩm KHÔNG bị gỡ usage ở đây — vẫn tính "đang dùng" chừng nào bản ghi sản phẩm còn tồn tại
// (dù đã soft-delete), job dọn mồ côi chỉ xử lý file thật sự không entity nào tham chiếu.
export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new AppError("Sản phẩm không tồn tại", 404, "NOT_FOUND");

  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await auditLog.record({
    actorId,
    action: "product.delete",
    entityType: "product",
    entityId: id,
    before: product,
    ...(ipAddress && { ipAddress }),
  });
}

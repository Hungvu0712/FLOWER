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

// Chọn qua bảng nối product_occasions rồi tự làm phẳng ở mapOccasions() bên dưới — Prisma không tự
// "unwrap" quan hệ n-n kiểu role_permissions (bảng nối tường minh, không phải implicit m-n), nên kết
// quả thô là { occasion: {...} }[], cần map lại thành { id, name, slug }[] cho gọn giống images/variants.
const OCCASIONS_SELECT = {
  orderBy: { occasion: { sortOrder: "asc" } },
  select: { occasion: { select: { id: true, name: true, slug: true } } },
} as const;

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
  variants: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, price: true, sortOrder: true },
  },
  occasions: OCCASIONS_SELECT,
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
  variants: {
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, price: true },
  },
  occasions: OCCASIONS_SELECT,
} as const;

type OccasionJoinRow = { occasion: { id: string; name: string; slug: string } };

// Làm phẳng { occasions: { occasion: {...} }[] } → { occasions: {...}[] } — áp dụng cho MỌI kết quả
// trả ra ngoài (list/listPublic/getPublicBySlug/create/update), giữ shape nhất quán với images/variants.
function mapOccasions<T extends { occasions: OccasionJoinRow[] }>(
  product: T,
): Omit<T, "occasions"> & { occasions: { id: string; name: string; slug: string }[] } {
  return { ...product, occasions: product.occasions.map((po) => po.occasion) };
}

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

// Thay thế TOÀN BỘ bộ biến thể — giống replaceImages() nhưng mỗi phần tử có trường ĐANG SỬA được
// (name/price), không chỉ 1 danh sách fileId đơn thuần, nên không thể xoá-hết-rồi-tạo-lại vô điều
// kiện (sẽ đổi `id` của mọi biến thể mỗi lần lưu, phá liên kết order_items.variant_id của các đơn ĐÃ
// đặt trước đó dùng variant đó). Thay vào đó: cập nhật theo `id` nếu có VÀ id đó thật sự thuộc sản
// phẩm này, còn lại (không có `id`, hoặc `id` lạ/của sản phẩm khác) coi như tạo mới; biến thể cũ
// không còn trong danh sách mới gửi lên thì xoá (order_items cũ vẫn hiển thị đúng nhờ đã snapshot
// variantName/unitPrice, variantId chỉ SetNull — xem schema.prisma).
async function replaceVariants(
  productId: string,
  variants: { id?: string; name: string; price: number }[] | undefined,
): Promise<void> {
  if (variants === undefined) return;

  const current = await prisma.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const currentIds = new Set(current.map((v) => v.id));
  const keepIds = variants
    .filter((v): v is { id: string; name: string; price: number } => !!v.id && currentIds.has(v.id))
    .map((v) => v.id);

  await prisma.productVariant.deleteMany({ where: { productId, id: { notIn: keepIds } } });

  for (const [index, v] of variants.entries()) {
    if (v.id && currentIds.has(v.id)) {
      await prisma.productVariant.update({
        where: { id: v.id },
        data: { name: v.name, price: v.price, sortOrder: index },
      });
    } else {
      await prisma.productVariant.create({
        data: { productId, name: v.name, price: v.price, sortOrder: index },
      });
    }
  }
}

// Thay thế TOÀN BỘ danh sách occasion đang gắn — khác replaceVariants() (không cần giữ `id` qua các
// lần lưu vì product_occasions không có gì tham chiếu ngược, giống hệt replaceImages()). Validate
// TRƯỚC khi xoá dữ liệu cũ — occasionId lạ sẽ 404 mà KHÔNG làm mất các tag đã gắn trước đó.
async function replaceOccasions(
  productId: string,
  occasionIds: string[] | undefined,
): Promise<void> {
  if (occasionIds === undefined) return;

  if (occasionIds.length > 0) {
    const found = await prisma.occasion.findMany({
      where: { id: { in: occasionIds } },
      select: { id: true },
    });
    if (found.length !== occasionIds.length) {
      throw new AppError("Một hoặc nhiều dịp lễ không tồn tại", 404, "OCCASION_NOT_FOUND");
    }
  }

  await prisma.productOccasion.deleteMany({ where: { productId } });
  if (occasionIds.length > 0) {
    await prisma.productOccasion.createMany({
      data: occasionIds.map((occasionId) => ({ productId, occasionId })),
    });
  }
}

export async function list({
  includeInactive,
  categoryId,
  occasionId,
  page,
  limit,
}: ListProductsQuery) {
  const where = {
    deletedAt: null,
    ...(includeInactive ? {} : { isActive: true }),
    ...(categoryId && { categoryId }),
    ...(occasionId && { occasions: { some: { occasionId } } }),
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
  return { items: items.map(mapOccasions), meta: buildPaginationMeta(page, limit, total) };
}

// Dùng cho storefront (public) — luôn isActive + chưa xoá, không có includeInactive.
export async function listPublic({ categoryId, occasionId, page, limit }: ListProductsQuery) {
  const where = {
    deletedAt: null,
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(occasionId && { occasions: { some: { occasionId } } }),
  };
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
  return { items: items.map(mapOccasions), meta: buildPaginationMeta(page, limit, total) };
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
  return mapOccasions(product);
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
  await replaceVariants(product.id, input.variants);
  await replaceOccasions(product.id, input.occasionIds);

  const full = mapOccasions(
    await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      select: PRODUCT_SELECT,
    }),
  );

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
  await replaceVariants(id, input.variants);
  await replaceOccasions(id, input.occasionIds);

  const full = mapOccasions(
    await prisma.product.findUniqueOrThrow({ where: { id }, select: PRODUCT_SELECT }),
  );

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

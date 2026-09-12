import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { slugify } from "../../../shared/utils/slugify";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateOccasionInput,
  UpdateOccasionInput,
  ListOccasionsQuery,
} from "./occasions.validation";

const OCCASION_SELECT = {
  id: true,
  name: true,
  slug: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Tự thêm hậu tố -2, -3... nếu slug đã tồn tại — giống categories.service.ts/products.service.ts
// (mỗi module domain tự giữ bản riêng, không tách chung).
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (
    await prisma.occasion.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function list({ includeInactive }: ListOccasionsQuery) {
  return prisma.occasion.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: OCCASION_SELECT,
  });
}

// Dùng cho storefront (public) — cùng trường với list() vì Occasion không có trường "nội bộ" nào
// (không giá, không ảnh) cần giấu, khác categories/products phải tách 2 hàm riêng.
export async function listPublic() {
  return prisma.occasion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

export async function create(actorId: string, input: CreateOccasionInput, ipAddress?: string) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.name));

  const occasion = await prisma.occasion.create({
    data: {
      name: input.name,
      slug,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    select: OCCASION_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "occasion.create",
    entityType: "occasion",
    entityId: occasion.id,
    after: occasion,
    ...(ipAddress && { ipAddress }),
  });
  return occasion;
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateOccasionInput,
  ipAddress?: string,
) {
  const before = await prisma.occasion.findUnique({ where: { id } });
  if (!before) throw new AppError("Dịp lễ không tồn tại", 404, "NOT_FOUND");

  // Đổi tên KHÔNG tự đổi slug (tránh gãy link đã chia sẻ) — chỉ đổi khi người dùng chủ động sửa slug.
  const slug =
    input.slug !== undefined ? await ensureUniqueSlug(slugify(input.slug), id) : undefined;

  const updated = await prisma.occasion.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: OCCASION_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "occasion.update",
    entityType: "occasion",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

// KHÔNG chặn xoá khi còn sản phẩm đang gắn dịp lễ này — khác categories (chặn xoá khi còn danh mục
// con, vì danh mục con sẽ mồ côi). Ở đây `product_occasions` chỉ là TAG (onDelete: Cascade ở
// schema.prisma), xoá occasion chỉ gỡ tag khỏi các sản phẩm liên quan — sản phẩm vẫn còn nguyên,
// không có gì "mồ côi" hay mất dữ liệu quan trọng.
export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const occasion = await prisma.occasion.findUnique({ where: { id } });
  if (!occasion) throw new AppError("Dịp lễ không tồn tại", 404, "NOT_FOUND");

  await prisma.occasion.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "occasion.delete",
    entityType: "occasion",
    entityId: id,
    before: occasion,
    ...(ipAddress && { ipAddress }),
  });
}

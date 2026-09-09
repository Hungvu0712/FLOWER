import { prisma } from '../../../config/prisma';
import { AppError } from '../../../core/errors';
import { slugify } from '../../../core/utils/slugify';
import * as filesService from '../../core/files/files.service';
import * as auditLog from '../../core/audit-log/auditLog.service';
import type { CreateCategoryInput, UpdateCategoryInput, ListCategoriesQuery } from './categories.validation';

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageFileId: true,
  parentId: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  imageFile: { select: { url: true } },
  _count: { select: { children: true } },
} as const;

// Tự thêm hậu tố -2, -3... nếu slug đã tồn tại — hiếm khi lặp quá 1-2 lần với dữ liệu thực tế.
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (await prisma.category.findFirst({ where: { slug, ...(excludeId && { id: { not: excludeId } }) } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

// Chặn gán danh mục con (hoặc chính nó) làm cha — tránh vòng lặp vô hạn khi duyệt cây sau này.
async function assertNoCycle(categoryId: string, proposedParentId: string): Promise<void> {
  if (categoryId === proposedParentId) {
    throw new AppError('Danh mục không thể là cha của chính nó', 400, 'CATEGORY_CYCLE');
  }
  const visited = new Set<string>();
  let current = await prisma.category.findUnique({ where: { id: proposedParentId }, select: { id: true, parentId: true } });
  while (current?.parentId) {
    if (current.parentId === categoryId) {
      throw new AppError('Không thể chọn danh mục con làm danh mục cha (tạo vòng lặp)', 400, 'CATEGORY_CYCLE');
    }
    if (visited.has(current.parentId)) break; // dữ liệu lỡ có vòng lặp sẵn — thoát an toàn, không loop vô hạn
    visited.add(current.parentId);
    current = await prisma.category.findUnique({ where: { id: current.parentId }, select: { id: true, parentId: true } });
  }
}

export async function list({ includeInactive }: ListCategoriesQuery) {
  return prisma.category.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: CATEGORY_SELECT,
  });
}

// Dùng cho storefront (public) — chỉ trường cần hiển thị, không lộ sortOrder/timestamps nội bộ.
export async function listPublic() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parentId: true,
      imageFile: { select: { url: true } },
    },
  });
}

export async function create(actorId: string, input: CreateCategoryInput, ipAddress?: string) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.name));

  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new AppError('Danh mục cha không tồn tại', 404, 'PARENT_NOT_FOUND');
  }

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      imageFileId: input.imageFileId ?? null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    },
    select: CATEGORY_SELECT,
  });

  if (input.imageFileId) {
    await filesService.setEntityFile({ fileId: input.imageFileId, entityType: 'category_image', entityId: category.id });
  }

  await auditLog.record({
    actorId,
    action: 'category.create',
    entityType: 'category',
    entityId: category.id,
    after: category,
    ...(ipAddress && { ipAddress }),
  });
  return category;
}

export async function update(actorId: string, id: string, input: UpdateCategoryInput, ipAddress?: string) {
  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) throw new AppError('Danh mục không tồn tại', 404, 'NOT_FOUND');

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertNoCycle(id, input.parentId);
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new AppError('Danh mục cha không tồn tại', 404, 'PARENT_NOT_FOUND');
  }

  // Đổi tên KHÔNG tự đổi slug (tránh gãy link đã chia sẻ) — chỉ đổi khi người dùng chủ động sửa slug.
  const slug = input.slug !== undefined ? await ensureUniqueSlug(slugify(input.slug), id) : undefined;

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.imageFileId !== undefined && { imageFileId: input.imageFileId }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    select: CATEGORY_SELECT,
  });

  if (input.imageFileId) {
    await filesService.setEntityFile({ fileId: input.imageFileId, entityType: 'category_image', entityId: id });
  }

  await auditLog.record({
    actorId,
    action: 'category.update',
    entityType: 'category',
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { children: true } } } });
  if (!category) throw new AppError('Danh mục không tồn tại', 404, 'NOT_FOUND');
  if (category._count.children > 0) {
    throw new AppError('Vẫn còn danh mục con — xoá hoặc chuyển danh mục con trước', 409, 'CATEGORY_HAS_CHILDREN');
  }

  await prisma.category.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: 'category.delete',
    entityType: 'category',
    entityId: id,
    before: category,
    ...(ipAddress && { ipAddress }),
  });
}

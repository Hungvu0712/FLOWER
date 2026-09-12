import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import { slugify } from "../../../shared/utils/slugify";
import { sanitizeDescriptionHtml } from "../../../shared/utils/sanitizeHtml";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import * as filesService from "../../core/files/files.service";
import * as auditLog from "../../core/audit-log/auditLog.service";
import type {
  CreateBlogPostInput,
  ListAdminBlogPostsQuery,
  ListBlogPostsQuery,
  UpdateBlogPostInput,
} from "./blog.validation";

// entityType dùng cho file_usages (setEntityFile/clearEntityFile) — xem categories.service.ts
// (imageFileId) cho cùng mẫu 1 file/1 entity, khác products (nhiều ảnh, dùng syncEntityFiles).
const BLOG_THUMBNAIL_ENTITY_TYPE = "blog_post_thumbnail";

const BLOG_POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, fullName: true } },
  thumbnailFile: { select: { id: true, url: true } },
} as const;

// Tự thêm hậu tố -2, -3... nếu slug đã tồn tại — giống categories.service.ts/products.service.ts.
async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let suffix = 2;
  while (
    await prisma.blogPost.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
    })
  ) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

// Công khai — CHỈ bài đã xuất bản (publishedAt <= now, cho phép LÊN LỊCH tương lai — bài có
// publishedAt trong tương lai coi như chưa xuất bản), và chưa xoá mềm.
export async function listPublic({ page, limit }: ListBlogPostsQuery) {
  const where = { deletedAt: null, publishedAt: { lte: new Date() } };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: BLOG_POST_SELECT,
    }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function getPublicBySlug(slug: string) {
  const post = await prisma.blogPost.findFirst({
    where: { slug, deletedAt: null, publishedAt: { lte: new Date() } },
    select: BLOG_POST_SELECT,
  });
  if (!post) throw new AppError("Bài viết không tồn tại", 404, "NOT_FOUND");
  return post;
}

// Quản trị (permission `blog.manage`) — lấy CẢ draft lẫn đã xuất bản, khác listPublic().
export async function listAdmin({ page, limit }: ListAdminBlogPostsQuery) {
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: BLOG_POST_SELECT,
    }),
    prisma.blogPost.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

export async function create(actorId: string, input: CreateBlogPostInput, ipAddress?: string) {
  const slug = await ensureUniqueSlug(slugify(input.slug || input.title));

  const post = await prisma.blogPost.create({
    data: {
      authorId: actorId,
      title: input.title,
      slug,
      excerpt: input.excerpt,
      content: sanitizeDescriptionHtml(input.content),
      thumbnailFileId: input.thumbnailFileId ?? null,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
    },
    select: BLOG_POST_SELECT,
  });

  if (input.thumbnailFileId) {
    await filesService.setEntityFile({
      fileId: input.thumbnailFileId,
      entityType: BLOG_THUMBNAIL_ENTITY_TYPE,
      entityId: post.id,
    });
  }

  await auditLog.record({
    actorId,
    action: "blog_post.create",
    entityType: "blog_post",
    entityId: post.id,
    after: post,
    ...(ipAddress && { ipAddress }),
  });
  return post;
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateBlogPostInput,
  ipAddress?: string,
) {
  const before = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
  if (!before) throw new AppError("Bài viết không tồn tại", 404, "NOT_FOUND");

  // Đổi tên KHÔNG tự đổi slug (tránh gãy link đã chia sẻ) — chỉ đổi khi người dùng chủ động sửa slug.
  const slug =
    input.slug !== undefined ? await ensureUniqueSlug(slugify(input.slug), id) : undefined;

  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(slug !== undefined && { slug }),
      ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
      ...(input.content !== undefined && { content: sanitizeDescriptionHtml(input.content) }),
      ...(input.thumbnailFileId !== undefined && { thumbnailFileId: input.thumbnailFileId }),
      ...(input.publishedAt !== undefined && {
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
      }),
    },
    select: BLOG_POST_SELECT,
  });

  // Khác categories.service.ts (không xử lý trường hợp gỡ ảnh) — gỡ hẳn thumbnail (thumbnailFileId:
  // null) phải giải phóng file_usages cũ, không chỉ khi có fileId MỚI.
  if (input.thumbnailFileId) {
    await filesService.setEntityFile({
      fileId: input.thumbnailFileId,
      entityType: BLOG_THUMBNAIL_ENTITY_TYPE,
      entityId: id,
    });
  } else if (input.thumbnailFileId === null) {
    await filesService.clearEntityFile(BLOG_THUMBNAIL_ENTITY_TYPE, id);
  }

  await auditLog.record({
    actorId,
    action: "blog_post.update",
    entityType: "blog_post",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const post = await prisma.blogPost.findFirst({ where: { id, deletedAt: null } });
  if (!post) throw new AppError("Bài viết không tồn tại", 404, "NOT_FOUND");

  await prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });

  await auditLog.record({
    actorId,
    action: "blog_post.delete",
    entityType: "blog_post",
    entityId: id,
    before: post,
    ...(ipAddress && { ipAddress }),
  });
}

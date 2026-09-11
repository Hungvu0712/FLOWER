import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import * as auditLog from "../audit-log/auditLog.service";
import type { CreateFolderInput, UpdateFolderInput, ListFoldersQuery } from "./folders.validation";

const FOLDER_SELECT = {
  id: true,
  name: true,
  parentId: true,
  createdBy: true,
  createdAt: true,
  _count: { select: { folders: true, files: true } },
} as const;

// Chặn gán thư mục con (hoặc chính nó) làm cha — tránh vòng lặp vô hạn khi duyệt cây sau này.
// Giống hệt cách categories.service.ts làm cho cây danh mục — cùng 1 dạng bài toán (tree tự tham chiếu).
async function assertNoCycle(folderId: string, proposedParentId: string): Promise<void> {
  if (folderId === proposedParentId) {
    throw new AppError("Thư mục không thể là cha của chính nó", 400, "FOLDER_CYCLE");
  }
  const visited = new Set<string>();
  let current = await prisma.folder.findUnique({
    where: { id: proposedParentId },
    select: { id: true, parentId: true },
  });
  while (current?.parentId) {
    if (current.parentId === folderId) {
      throw new AppError(
        "Không thể chọn thư mục con làm thư mục cha (tạo vòng lặp)",
        400,
        "FOLDER_CYCLE",
      );
    }
    if (visited.has(current.parentId)) break; // dữ liệu lỡ có vòng lặp sẵn — thoát an toàn, không loop vô hạn
    visited.add(current.parentId);
    current = await prisma.folder.findUnique({
      where: { id: current.parentId },
      select: { id: true, parentId: true },
    });
  }
}

// Bỏ trống parentId = xem cấp gốc (parentId null) — xem giải thích ở folders.validation.ts.
export async function list({ parentId }: ListFoldersQuery) {
  return prisma.folder.findMany({
    where: { parentId: parentId ?? null },
    orderBy: { name: "asc" },
    select: FOLDER_SELECT,
  });
}

export async function create(actorId: string, input: CreateFolderInput, ipAddress?: string) {
  if (input.parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new AppError("Thư mục cha không tồn tại", 404, "PARENT_NOT_FOUND");
  }

  const folder = await prisma.folder.create({
    data: { name: input.name, parentId: input.parentId ?? null, createdBy: actorId },
    select: FOLDER_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "folder.create",
    entityType: "folder",
    entityId: folder.id,
    after: folder,
    ...(ipAddress && { ipAddress }),
  });
  return folder;
}

export async function update(
  actorId: string,
  id: string,
  input: UpdateFolderInput,
  ipAddress?: string,
) {
  const before = await prisma.folder.findUnique({ where: { id } });
  if (!before) throw new AppError("Thư mục không tồn tại", 404, "NOT_FOUND");

  if (input.parentId !== undefined && input.parentId !== null) {
    await assertNoCycle(id, input.parentId);
    const parent = await prisma.folder.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new AppError("Thư mục cha không tồn tại", 404, "PARENT_NOT_FOUND");
  }

  const updated = await prisma.folder.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.parentId !== undefined && { parentId: input.parentId }),
    },
    select: FOLDER_SELECT,
  });

  await auditLog.record({
    actorId,
    action: "folder.update",
    entityType: "folder",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

export async function remove(actorId: string, id: string, ipAddress?: string): Promise<void> {
  const folder = await prisma.folder.findUnique({
    where: { id },
    include: { _count: { select: { folders: true, files: true } } },
  });
  if (!folder) throw new AppError("Thư mục không tồn tại", 404, "NOT_FOUND");
  if (folder._count.folders > 0 || folder._count.files > 0) {
    throw new AppError(
      "Thư mục vẫn còn thư mục con hoặc file — chuyển hoặc xoá trước khi xoá thư mục này",
      409,
      "FOLDER_NOT_EMPTY",
    );
  }

  await prisma.folder.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "folder.delete",
    entityType: "folder",
    entityId: id,
    before: folder,
    ...(ipAddress && { ipAddress }),
  });
}

import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import * as auditLog from "../audit-log/auditLog.service";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
  ListPermissionsQuery,
} from "./permissions.validation";

export async function list({ assignable }: ListPermissionsQuery) {
  return prisma.permission.findMany({
    where: assignable ? { isRestricted: false } : undefined,
    orderBy: [{ groupName: "asc" }, { code: "asc" }],
  });
}

// Permission mới tạo qua UI chỉ là dữ liệu — nó KHÔNG tự chặn được request nào cho tới khi có route
// backend thật sự gọi authorize('code-này'). Đây không phải giới hạn có thể sửa bằng UI, mà là bản
// chất của mô hình permission thực thi trong code — xem docs/07 §2, docs/02 §2.
export async function create(
  actorId: string,
  input: CreatePermissionInput,
  ipAddress?: string,
) {
  const existing = await prisma.permission.findUnique({
    where: { code: input.code },
  });
  if (existing)
    throw new AppError(
      "Permission code đã tồn tại",
      409,
      "PERMISSION_CODE_TAKEN",
    );

  const permission = await prisma.permission.create({
    data: {
      code: input.code,
      groupName: input.groupName,
      ...(input.description && { description: input.description }),
      isSystem: false,
      isRestricted: false,
    },
  });

  await auditLog.record({
    actorId,
    action: "permission.create",
    entityType: "permission",
    entityId: permission.id,
    after: permission,
    ...(ipAddress && { ipAddress }),
  });
  return permission;
}

export async function update(
  actorId: string,
  id: number,
  input: UpdatePermissionInput,
  ipAddress?: string,
) {
  const permission = await prisma.permission.findUnique({ where: { id } });
  if (!permission)
    throw new AppError("Permission không tồn tại", 404, "NOT_FOUND");
  if (
    input.code !== undefined &&
    input.code !== permission.code &&
    permission.isSystem
  ) {
    throw new AppError(
      "Không thể đổi code của permission hệ thống — route trong code đang tham chiếu đúng code cũ",
      403,
      "SYSTEM_PERMISSION_LOCKED",
    );
  }

  const before = permission;
  const updated = await prisma.permission.update({
    where: { id },
    data: {
      ...(input.code !== undefined && { code: input.code }),
      ...(input.groupName !== undefined && { groupName: input.groupName }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    },
  });

  await auditLog.record({
    actorId,
    action: "permission.update",
    entityType: "permission",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

export async function remove(
  actorId: string,
  id: number,
  ipAddress?: string,
): Promise<void> {
  const permission = await prisma.permission.findUnique({
    where: { id },
    include: { _count: { select: { roles: true } } },
  });
  if (!permission)
    throw new AppError("Permission không tồn tại", 404, "NOT_FOUND");
  if (permission.isSystem) {
    throw new AppError(
      "Permission hệ thống (đã có route tham chiếu) không thể xoá",
      403,
      "SYSTEM_PERMISSION_LOCKED",
    );
  }
  if (permission._count.roles > 0)
    throw new AppError(
      "Vẫn còn role đang gán permission này",
      409,
      "PERMISSION_IN_USE",
    );

  await prisma.permission.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "permission.delete",
    entityType: "permission",
    entityId: id,
    before: permission,
    ...(ipAddress && { ipAddress }),
  });
}

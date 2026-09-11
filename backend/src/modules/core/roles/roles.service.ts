import { prisma } from "../../../config/prisma";
import { AppError } from "../../../shared/errors";
import * as auditLog from "../audit-log/auditLog.service";
import type { CreateRoleInput, UpdateRoleInput } from "./roles.validation";

// Lọc bỏ mọi permission is_restricted khỏi 1 danh sách permissionId — dùng cho cả create và update,
// bất kể payload client gửi gì. Đây là chốt chặn "shadow super_admin" — xem docs/07 §2.
async function stripRestrictedPermissionIds(
  permissionIds: number[] | undefined,
): Promise<number[]> {
  if (!permissionIds?.length) return [];
  const allowed = await prisma.permission.findMany({
    where: { id: { in: permissionIds }, isRestricted: false },
    select: { id: true },
  });
  return allowed.map((p) => p.id);
}

export async function list() {
  return prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { id: "asc" },
  });
}

export async function create(actorId: string, input: CreateRoleInput, ipAddress?: string) {
  const safePermissionIds = await stripRestrictedPermissionIds(input.permissionIds);

  const role = await prisma.role.create({
    data: {
      code: input.code,
      name: input.name,
      ...(input.description && { description: input.description }),
      isSystem: false,
      permissions: {
        create: safePermissionIds.map((permissionId) => ({ permissionId })),
      },
    },
  });

  await auditLog.record({
    actorId,
    action: "role.create",
    entityType: "role",
    entityId: role.id,
    after: role,
    ...(ipAddress && { ipAddress }),
  });
  return role;
}

export async function update(
  actorId: string,
  id: number,
  input: UpdateRoleInput,
  ipAddress?: string,
) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError("Role không tồn tại", 404, "NOT_FOUND");
  if (role.isSystem)
    throw new AppError("Không thể sửa cấu trúc quyền của System Role", 403, "SYSTEM_ROLE_LOCKED");

  const before = role;

  if (input.permissionIds) {
    const safePermissionIds = await stripRestrictedPermissionIds(input.permissionIds);
    // Bọc transaction — trước đây 2 lệnh này chạy tách rời: nếu createMany lỗi giữa chừng (vd mất kết
    // nối DB), role đã bị xoá sạch permission ở bước deleteMany nhưng KHÔNG có gì thay thế, ảnh hưởng
    // ngay lập tức tới mọi người dùng đang gán role đó. Xem docs/12 BE-06.
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: safePermissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      }),
    ]);
  }

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
    },
  });

  await auditLog.record({
    actorId,
    action: "role.update",
    entityType: "role",
    entityId: id,
    before,
    after: updated,
    ...(ipAddress && { ipAddress }),
  });
  return updated;
}

export async function remove(actorId: string, id: number, ipAddress?: string): Promise<void> {
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });
  if (!role) throw new AppError("Role không tồn tại", 404, "NOT_FOUND");
  if (role.isSystem) throw new AppError("Không thể xoá System Role", 403, "SYSTEM_ROLE_LOCKED");
  if (role._count.users > 0)
    throw new AppError("Vẫn còn user đang gán role này", 409, "ROLE_IN_USE");

  await prisma.role.delete({ where: { id } });
  await auditLog.record({
    actorId,
    action: "role.delete",
    entityType: "role",
    entityId: id,
    before: role,
    ...(ipAddress && { ipAddress }),
  });
}

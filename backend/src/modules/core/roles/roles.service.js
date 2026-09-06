const prisma = require('../../../config/prisma');
const AppError = require('../../../lib/AppError');
const auditLog = require('../audit-log/auditLog.service');

// Lọc bỏ mọi permission is_restricted khỏi 1 danh sách permissionId — dùng cho cả create và update,
// bất kể payload client gửi gì. Đây là chốt chặn "shadow super_admin" — xem SECURITY.md §2.
async function stripRestrictedPermissionIds(permissionIds) {
  if (!permissionIds?.length) return [];
  const allowed = await prisma.permission.findMany({
    where: { id: { in: permissionIds }, isRestricted: false },
    select: { id: true },
  });
  return allowed.map((p) => p.id);
}

async function list() {
  return prisma.role.findMany({
    include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
    orderBy: { id: 'asc' },
  });
}

async function create(actorId, { code, name, description, permissionIds }, ipAddress) {
  const safePermissionIds = await stripRestrictedPermissionIds(permissionIds);

  const role = await prisma.role.create({
    data: {
      code,
      name,
      description,
      isSystem: false,
      permissions: { create: safePermissionIds.map((permissionId) => ({ permissionId })) },
    },
  });

  await auditLog.record({ actorId, action: 'role.create', entityType: 'role', entityId: role.id, after: role, ipAddress });
  return role;
}

async function update(actorId, id, { name, description, permissionIds }, ipAddress) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new AppError('Role không tồn tại', 404, 'NOT_FOUND');
  if (role.isSystem) throw new AppError('Không thể sửa cấu trúc quyền của System Role', 403, 'SYSTEM_ROLE_LOCKED');

  const before = role;

  if (permissionIds) {
    const safePermissionIds = await stripRestrictedPermissionIds(permissionIds);
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.rolePermission.createMany({
      data: safePermissionIds.map((permissionId) => ({ roleId: id, permissionId })),
    });
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }) },
  });

  await auditLog.record({ actorId, action: 'role.update', entityType: 'role', entityId: id, before, after: updated, ipAddress });
  return updated;
}

async function remove(actorId, id, ipAddress) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw new AppError('Role không tồn tại', 404, 'NOT_FOUND');
  if (role.isSystem) throw new AppError('Không thể xoá System Role', 403, 'SYSTEM_ROLE_LOCKED');
  if (role._count.users > 0) throw new AppError('Vẫn còn user đang gán role này', 409, 'ROLE_IN_USE');

  await prisma.role.delete({ where: { id } });
  await auditLog.record({ actorId, action: 'role.delete', entityType: 'role', entityId: id, before: role, ipAddress });
}

module.exports = { list, create, update, remove };

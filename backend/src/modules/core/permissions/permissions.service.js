const prisma = require('../../../config/prisma');
const AppError = require('../../../lib/AppError');
const auditLog = require('../audit-log/auditLog.service');

async function list({ assignable }) {
  return prisma.permission.findMany({
    where: assignable ? { isRestricted: false } : undefined,
    orderBy: [{ groupName: 'asc' }, { code: 'asc' }],
  });
}

// Permission mới tạo qua UI chỉ là dữ liệu — nó KHÔNG tự chặn được request nào cho tới khi có route
// backend thật sự gọi authorize('code-này'). Đây là giới hạn cố hữu của mô hình permission thực thi
// trong code, không phải bug — xem SECURITY.md §2 và ARCHITECTURE.md §2.
async function create(actorId, { code, groupName, description }, ipAddress) {
  const existing = await prisma.permission.findUnique({ where: { code } });
  if (existing) throw new AppError('Permission code đã tồn tại', 409, 'PERMISSION_CODE_TAKEN');

  const permission = await prisma.permission.create({
    data: { code, groupName, description, isSystem: false, isRestricted: false },
  });

  await auditLog.record({ actorId, action: 'permission.create', entityType: 'permission', entityId: permission.id, after: permission, ipAddress });
  return permission;
}

async function update(actorId, id, { code, groupName, description }, ipAddress) {
  const permission = await prisma.permission.findUnique({ where: { id } });
  if (!permission) throw new AppError('Permission không tồn tại', 404, 'NOT_FOUND');
  if (code !== undefined && code !== permission.code && permission.isSystem) {
    throw new AppError('Không thể đổi code của permission hệ thống — route trong code đang tham chiếu đúng code cũ', 403, 'SYSTEM_PERMISSION_LOCKED');
  }

  const before = permission;
  const updated = await prisma.permission.update({
    where: { id },
    data: {
      ...(code !== undefined && { code }),
      ...(groupName !== undefined && { groupName }),
      ...(description !== undefined && { description }),
    },
  });

  await auditLog.record({ actorId, action: 'permission.update', entityType: 'permission', entityId: id, before, after: updated, ipAddress });
  return updated;
}

async function remove(actorId, id, ipAddress) {
  const permission = await prisma.permission.findUnique({
    where: { id },
    include: { _count: { select: { roles: true } } },
  });
  if (!permission) throw new AppError('Permission không tồn tại', 404, 'NOT_FOUND');
  if (permission.isSystem) {
    throw new AppError('Permission hệ thống (đã có route tham chiếu) không thể xoá', 403, 'SYSTEM_PERMISSION_LOCKED');
  }
  if (permission._count.roles > 0) throw new AppError('Vẫn còn role đang gán permission này', 409, 'PERMISSION_IN_USE');

  await prisma.permission.delete({ where: { id } });
  await auditLog.record({ actorId, action: 'permission.delete', entityType: 'permission', entityId: id, before: permission, ipAddress });
}

module.exports = { list, create, update, remove };

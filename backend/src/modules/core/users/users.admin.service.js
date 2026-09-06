const crypto = require('crypto');
const prisma = require('../../../config/prisma');
const AppError = require('../../../lib/AppError');
const { hashPassword } = require('../../../lib/hash');
const emailService = require('../email/email.service');
const { newPasswordTemplate } = require('../email/email.templates');
const auditLog = require('../audit-log/auditLog.service');

// Mọi hàm ở đây chỉ được gọi sau khi qua authorize('users.manage') (chỉ super_admin có permission
// này — xem DATABASE.md §2.1/2.3). Các ràng buộc chống tự thao tác lên chính mình và chống leo thang
// quyền được chặn cứng ở đây, không chỉ dựa vào UI — xem SECURITY.md §2.
function assertNotSelf(actorId, targetId, message) {
  if (actorId === targetId) {
    throw new AppError(message, 400, 'CANNOT_TARGET_SELF');
  }
}

async function listUsers({ status, role, search, page, pageSize }) {
  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(role && { roles: { some: { role: { code: role } } } }),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, status: true, createdAt: true,
        roles: { select: { role: { select: { code: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

async function setBlocked(actorId, targetId, blocked, ipAddress) {
  assertNotSelf(actorId, targetId, blocked ? 'Không thể tự khoá chính mình' : 'Không thể tự mở khoá chính mình');

  const before = await prisma.user.findUnique({ where: { id: targetId }, select: { status: true } });
  if (!before) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');

  await prisma.user.update({ where: { id: targetId }, data: { status: blocked ? 'blocked' : 'active' } });

  await auditLog.record({
    actorId,
    action: blocked ? 'user.block' : 'user.unblock',
    entityType: 'user',
    entityId: targetId,
    before,
    after: { status: blocked ? 'blocked' : 'active' },
    ipAddress,
  });
}

async function softDeleteUser(actorId, targetId, ipAddress) {
  assertNotSelf(actorId, targetId, 'Không thể tự xoá chính mình');

  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user || user.deletedAt) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');

  await prisma.user.update({ where: { id: targetId }, data: { deletedAt: new Date(), status: 'blocked' } });
  await prisma.session.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } });

  await auditLog.record({ actorId, action: 'user.delete', entityType: 'user', entityId: targetId, ipAddress });
}

async function resetPassword(actorId, targetId, ipAddress) {
  const user = await prisma.user.findUnique({ where: { id: targetId } });
  if (!user || user.deletedAt) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');

  const newPassword = crypto.randomBytes(9).toString('base64url'); // đủ mạnh, dễ đọc để paste
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: targetId }, data: { passwordHash } });

  // Mật khẩu bản rõ chỉ tồn tại trong bộ nhớ đủ lâu để gửi email — không log, không trả về API.
  await emailService.sendEmail({
    to: user.email,
    subject: 'Mật khẩu mới của bạn',
    html: newPasswordTemplate({ password: newPassword }),
    type: 'password_reset',
  });

  await auditLog.record({ actorId, action: 'user.reset_password', entityType: 'user', entityId: targetId, ipAddress });
}

async function updateRole(actorId, targetId, roleCode, ipAddress) {
  assertNotSelf(actorId, targetId, 'Không thể tự đổi role của chính mình');

  if (roleCode === 'super_admin') {
    throw new AppError('Không thể gán quyền super_admin qua chức năng này', 403, 'CANNOT_GRANT_SUPER_ADMIN');
  }

  const [user, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetId }, include: { roles: { include: { role: true } } } }),
    prisma.role.findUnique({ where: { code: roleCode } }),
  ]);
  if (!user || user.deletedAt) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');
  if (!role) throw new AppError('Role không tồn tại', 404, 'ROLE_NOT_FOUND');

  const before = user.roles.map((r) => r.role.code);

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: targetId } }),
    prisma.userRole.create({ data: { userId: targetId, roleId: role.id } }),
  ]);

  await auditLog.record({
    actorId,
    action: 'user.role_update',
    entityType: 'user',
    entityId: targetId,
    before: { roles: before },
    after: { roles: [roleCode] },
    ipAddress,
  });
}

module.exports = { listUsers, setBlocked, softDeleteUser, resetPassword, updateRole };

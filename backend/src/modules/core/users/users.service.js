const prisma = require('../../../config/prisma');
const AppError = require('../../../lib/AppError');
const { hashPassword, verifyPassword, sha256 } = require('../../../lib/hash');
const filesService = require('../files/files.service');

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');
  return { ...sanitizeUser(user), roles: user.roles.map((r) => r.role.code) };
}

async function updateProfile(userId, { fullName, avatarFileId, phone }) {
  if (avatarFileId !== undefined) {
    // Đánh dấu file mới là avatar của user này; ảnh cũ (nếu có) tự động hết được tính là đang dùng
    // khi không còn file_usages nào trỏ tới — job dọn mồ côi sẽ xử lý sau, không cần xoá thủ công ở đây.
    await filesService.setEntityFile({ fileId: avatarFileId, entityType: 'user_avatar', entityId: userId });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(avatarFileId !== undefined && { avatarFileId }),
      ...(phone !== undefined && { phone }),
    },
  });
  return sanitizeUser(user);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');

  if (user.passwordHash) {
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Mật khẩu hiện tại không đúng', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

async function listSessions(userId, currentRefreshToken) {
  const currentHash = currentRefreshToken ? sha256(currentRefreshToken) : null;
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastActiveAt: 'desc' },
  });
  return sessions.map((s) => ({
    id: s.id,
    deviceName: s.deviceName,
    ipAddress: s.ipAddress,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: s.refreshTokenHash === currentHash,
  }));
}

async function revokeSession(userId, sessionId) {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError('Không tìm thấy thiết bị', 404, 'NOT_FOUND');
  }
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

async function revokeOtherSessions(userId, currentRefreshToken) {
  const currentHash = currentRefreshToken ? sha256(currentRefreshToken) : null;
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(currentHash && { refreshTokenHash: { not: currentHash } }) },
    data: { revokedAt: new Date() },
  });
}

module.exports = { getMe, updateProfile, changePassword, listSessions, revokeSession, revokeOtherSessions };

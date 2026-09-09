import type { User } from '@prisma/client';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../core/errors';
import { hashPassword, verifyPassword, sha256 } from '../../../core/utils/hash';
import { loadUserRolesAndPermissions } from '../../../core/utils/rbac';
import * as filesService from '../files/files.service';
import type { UpdateProfileInput, ChangePasswordInput } from './users.validation';

function sanitizeUser(user: User) {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

// Trả roles + permissions HIỆN TẠI từ DB (không phải từ token) — frontend dùng dữ liệu này để cập
// nhật menu/quyền truy cập ngay sau F5, không cần đăng xuất/đăng nhập lại. Xem ARCHITECTURE.md §10.
export async function getMe(userId: string) {
  const [user, { roles, permissions }] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { avatarFile: true } }),
    loadUserRolesAndPermissions(userId),
  ]);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');
  return { ...sanitizeUser(user), roles, permissions };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  if (input.avatarFileId !== undefined && input.avatarFileId !== null) {
    // Đánh dấu file mới là avatar của user này; ảnh cũ (nếu có) tự động hết được tính là đang dùng
    // khi không còn file_usages nào trỏ tới — job dọn mồ côi sẽ xử lý sau, không cần xoá thủ công ở đây.
    await filesService.setEntityFile({ fileId: input.avatarFileId, entityType: 'user_avatar', entityId: userId });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.fullName !== undefined && { fullName: input.fullName }),
      ...(input.avatarFileId !== undefined && { avatarFileId: input.avatarFileId }),
      ...(input.phone !== undefined && { phone: input.phone }),
    },
    include: { avatarFile: true },
  });
  return sanitizeUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Không tìm thấy người dùng', 404, 'NOT_FOUND');

  if (user.passwordHash) {
    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Mật khẩu hiện tại không đúng', 401, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function listSessions(userId: string, currentRefreshToken: string | undefined) {
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

export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    throw new AppError('Không tìm thấy thiết bị', 404, 'NOT_FOUND');
  }
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeOtherSessions(userId: string, currentRefreshToken: string | undefined): Promise<void> {
  const currentHash = currentRefreshToken ? sha256(currentRefreshToken) : null;
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(currentHash && { refreshTokenHash: { not: currentHash } }) },
    data: { revokedAt: new Date() },
  });
}

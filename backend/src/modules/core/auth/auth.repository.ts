import type { User } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

// docs/12 BE-17: khoá tạm sau nhiều lần đăng nhập sai liên tiếp. `increment: 1` của Prisma sinh ra
// `UPDATE ... SET count = count + 1` — atomic ở tầng DB, không bị mất lượt đếm khi có request đồng
// thời (khác kiểu đọc-rồi-ghi thủ công dễ bị race condition).
export async function incrementFailedLoginAttempts(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });
  return updated.failedLoginAttempts;
}

export function lockUserUntil(userId: string, until: Date): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { lockedUntil: until } });
}

// Gọi ngay khi đăng nhập ĐÚNG mật khẩu — xoá dấu vết các lần sai trước đó, không để cộng dồn mãi.
export function resetFailedLoginAttempts(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}

interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string | null;
  emailVerifiedAt?: Date;
}

export async function createUserWithMemberRole(input: CreateUserInput): Promise<User> {
  const memberRole = await prisma.role.findUnique({ where: { code: "member" } });
  if (!memberRole)
    throw new Error('Role "member" chưa được seed — chạy `npm run seed:core` trước.');

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash: input.passwordHash,
      ...(input.emailVerifiedAt && { emailVerifiedAt: input.emailVerifiedAt }),
      roles: { create: { roleId: memberRole.id } },
    },
  });
}

export function findAuthAccount(provider: string, providerAccountId: string) {
  return prisma.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
  });
}

export function linkAuthAccount(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
}) {
  return prisma.authAccount.create({ data: input });
}

export async function isLoginMethodEnabled(method: string): Promise<boolean> {
  const setting = await prisma.loginMethodSetting.findUnique({ where: { method } });
  return setting?.isEnabled ?? false;
}

interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export function createSession(input: CreateSessionInput) {
  return prisma.session.create({ data: input });
}

export function findActiveSessionByHash(refreshTokenHash: string) {
  return prisma.session.findFirst({ where: { refreshTokenHash, revokedAt: null } });
}

// KHÔNG lọc revokedAt — refreshSession() cần phân biệt "chưa từng tồn tại" với "đã bị thu hồi" (dấu
// hiệu token bị dùng lại, xem docs/12 BE-03), khác findActiveSessionByHash() ở trên chỉ cần biết còn
// dùng được hay không.
export function findSessionByHash(refreshTokenHash: string) {
  return prisma.session.findUnique({ where: { refreshTokenHash } });
}

export function revokeSession(id: string) {
  return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
}

export function createMagicLinkToken(input: {
  email: string;
  userId?: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.magicLinkToken.create({ data: input });
}

// Kiểm tra hợp lệ (chưa dùng, chưa hết hạn) VÀ đánh dấu đã dùng trong CÙNG 1 câu lệnh — trước đây
// tách rời (findUnique rồi mới update), 2 request đồng thời với cùng token đều có thể vượt qua kiểm
// tra `usedAt` trước khi bất kỳ bước đánh dấu nào hoàn tất, phá vỡ đảm bảo "dùng 1 lần". `updateMany`
// với where khớp cả `usedAt: null` khiến Postgres tự khoá dòng ở request THẮNG cuộc đua — request còn
// lại khớp 0 dòng (`count === 0`). Đọc lại record SAU khi đã chắc chắn thắng cuộc đua thì an toàn,
// không còn race nào nữa. Xem docs/12 BE-05.
export async function consumeMagicLinkToken(tokenHash: string) {
  const { count } = await prisma.magicLinkToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null;
  return prisma.magicLinkToken.findUnique({ where: { tokenHash } });
}

export function createPasswordResetToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return prisma.passwordResetToken.create({ data: input });
}

// Cùng nguyên lý với consumeMagicLinkToken() — xem comment ở đó.
export async function consumePasswordResetToken(tokenHash: string) {
  const { count } = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null;
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

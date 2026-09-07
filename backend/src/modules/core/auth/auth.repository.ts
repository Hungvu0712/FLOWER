import type { User } from '@prisma/client';
import { prisma } from '../../../config/prisma';

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string | null;
  emailVerifiedAt?: Date;
}

export async function createUserWithMemberRole(input: CreateUserInput): Promise<User> {
  const memberRole = await prisma.role.findUnique({ where: { code: 'member' } });
  if (!memberRole) throw new Error('Role "member" chưa được seed — chạy `npm run seed:core` trước.');

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

export function linkAuthAccount(input: { userId: string; provider: string; providerAccountId: string }) {
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

export function revokeSession(id: string) {
  return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
}

export function createMagicLinkToken(input: { email: string; userId?: string; tokenHash: string; expiresAt: Date }) {
  return prisma.magicLinkToken.create({ data: input });
}

export function findMagicLinkTokenByHash(tokenHash: string) {
  return prisma.magicLinkToken.findUnique({ where: { tokenHash } });
}

export function markMagicLinkUsed(id: string) {
  return prisma.magicLinkToken.update({ where: { id }, data: { usedAt: new Date() } });
}

export function createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
  return prisma.passwordResetToken.create({ data: input });
}

export function findPasswordResetTokenByHash(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

export function markPasswordResetUsed(id: string) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

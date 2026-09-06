const prisma = require('../../../config/prisma');

function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function createUserWithMemberRole({ fullName, email, passwordHash, emailVerifiedAt }) {
  const memberRole = await prisma.role.findUnique({ where: { code: 'member' } });
  if (!memberRole) throw new Error('Role "member" chưa được seed — chạy `npm run seed:core` trước.');

  return prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      emailVerifiedAt,
      roles: { create: { roleId: memberRole.id } },
    },
  });
}

function findAuthAccount(provider, providerAccountId) {
  return prisma.authAccount.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId } },
  });
}

function linkAuthAccount({ userId, provider, providerAccountId }) {
  return prisma.authAccount.create({ data: { userId, provider, providerAccountId } });
}

function isLoginMethodEnabled(method) {
  return prisma.loginMethodSetting.findUnique({ where: { method } }).then((s) => s?.isEnabled ?? false);
}

function createSession({ userId, refreshTokenHash, deviceName, ipAddress, userAgent, expiresAt }) {
  return prisma.session.create({
    data: { userId, refreshTokenHash, deviceName, ipAddress, userAgent, expiresAt },
  });
}

function findActiveSessionByHash(refreshTokenHash) {
  return prisma.session.findFirst({ where: { refreshTokenHash, revokedAt: null } });
}

function revokeSession(id) {
  return prisma.session.update({ where: { id }, data: { revokedAt: new Date() } });
}

function createMagicLinkToken({ email, userId, tokenHash, expiresAt }) {
  return prisma.magicLinkToken.create({ data: { email, userId, tokenHash, expiresAt } });
}

function findMagicLinkTokenByHash(tokenHash) {
  return prisma.magicLinkToken.findUnique({ where: { tokenHash } });
}

function markMagicLinkUsed(id) {
  return prisma.magicLinkToken.update({ where: { id }, data: { usedAt: new Date() } });
}

function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
  return prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt } });
}

function findPasswordResetTokenByHash(tokenHash) {
  return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
}

function markPasswordResetUsed(id) {
  return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
}

function updatePasswordHash(userId, passwordHash) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUserWithMemberRole,
  findAuthAccount,
  linkAuthAccount,
  isLoginMethodEnabled,
  createSession,
  findActiveSessionByHash,
  revokeSession,
  createMagicLinkToken,
  findMagicLinkTokenByHash,
  markMagicLinkUsed,
  createPasswordResetToken,
  findPasswordResetTokenByHash,
  markPasswordResetUsed,
  updatePasswordHash,
};

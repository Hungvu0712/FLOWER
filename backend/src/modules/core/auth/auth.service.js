const { OAuth2Client } = require('google-auth-library');
const AppError = require('../../../lib/AppError');
const env = require('../../../config/env');
const prisma = require('../../../config/prisma');
const { hashPassword, verifyPassword, sha256, generateRandomToken } = require('../../../lib/hash');
const { signAccessToken } = require('../../../lib/jwt');
const { loadUserRolesAndPermissions } = require('../../../lib/rbac');
const emailService = require('../email/email.service');
const { magicLinkTemplate, passwordResetTemplate } = require('../email/email.templates');
const repo = require('./auth.repository');

const googleClient = new OAuth2Client(env.google.clientId);

// ---- Helper dùng chung cho mọi luồng login (password/magic-link/google) ----
async function issueSession(user, meta) {
  const { roles, permissions } = await loadUserRolesAndPermissions(user.id);

  const accessToken = signAccessToken({ sub: user.id, roles, permissions });

  const refreshToken = generateRandomToken();
  const refreshTokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);

  await repo.createSession({
    userId: user.id,
    refreshTokenHash,
    deviceName: meta?.deviceName,
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    expiresAt,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function assertActive(user) {
  if (!user) throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
  if (user.status === 'blocked') throw new AppError('Tài khoản đã bị khoá', 403, 'ACCOUNT_BLOCKED');
  if (user.deletedAt) throw new AppError('Tài khoản không tồn tại', 401, 'INVALID_CREDENTIALS');
}

async function assertMethodEnabled(method, label) {
  const enabled = await repo.isLoginMethodEnabled(method);
  if (!enabled) throw new AppError(`${label} hiện đang tắt`, 403, 'LOGIN_METHOD_DISABLED');
}

// ---- Email + Password ----

async function register({ fullName, email, password }) {
  await assertMethodEnabled('email_password', 'Đăng ký bằng email/mật khẩu');

  const existing = await repo.findUserByEmail(email);
  if (existing) throw new AppError('Email đã được sử dụng', 409, 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(password);
  const user = await repo.createUserWithMemberRole({ fullName, email, passwordHash });
  return user;
}

async function loginWithPassword({ email, password }) {
  await assertMethodEnabled('email_password', 'Đăng nhập bằng email/mật khẩu');

  const user = await repo.findUserByEmail(email);
  assertActive(user);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');

  return user;
}

// ---- Magic link (dùng 1 lần, hết hạn ngắn — xem SECURITY.md §1) ----

async function requestMagicLink({ email }) {
  await assertMethodEnabled('magic_link', 'Đăng nhập bằng magic link');

  const user = await repo.findUserByEmail(email);
  // Không tiết lộ email có tồn tại hay không qua response — luôn trả về thành công.
  if (user && user.status !== 'blocked' && !user.deletedAt) {
    const token = generateRandomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + env.magicLink.ttlMinutes * 60 * 1000);

    await repo.createMagicLinkToken({ email, userId: user.id, tokenHash, expiresAt });

    const url = `${env.magicLink.baseUrl}?token=${token}`;
    await emailService.sendEmail({
      to: email,
      subject: 'Liên kết đăng nhập',
      html: magicLinkTemplate({ url }),
      type: 'magic_link',
    });
  }
}

async function verifyMagicLink({ token }) {
  const tokenHash = sha256(token);
  const record = await repo.findMagicLinkTokenByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 401, 'INVALID_MAGIC_LINK');
  }

  await repo.markMagicLinkUsed(record.id);

  let user = record.userId ? await repo.findUserById(record.userId) : await repo.findUserByEmail(record.email);
  if (!user) {
    // Email chưa từng có tài khoản — magic link đóng luôn vai trò "đăng ký nhanh".
    user = await repo.createUserWithMemberRole({
      fullName: record.email.split('@')[0],
      email: record.email,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    });
  }

  assertActive(user);
  return user;
}

// ---- Google OAuth (verify ID token do frontend lấy từ Google Identity Services) ----

async function loginWithGoogle({ idToken }) {
  await assertMethodEnabled('google_oauth', 'Đăng nhập bằng Google');

  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.google.clientId });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new AppError('Không xác thực được tài khoản Google', 401, 'INVALID_GOOGLE_TOKEN');

  let authAccount = await repo.findAuthAccount('google', payload.sub);
  let user;

  if (authAccount) {
    user = await repo.findUserById(authAccount.userId);
  } else {
    user = await repo.findUserByEmail(payload.email);
    if (!user) {
      user = await repo.createUserWithMemberRole({
        fullName: payload.name || payload.email.split('@')[0],
        email: payload.email,
        passwordHash: null,
        emailVerifiedAt: new Date(),
      });
    }
    await repo.linkAuthAccount({ userId: user.id, provider: 'google', providerAccountId: payload.sub });
  }

  assertActive(user);
  return user;
}

// ---- Session: refresh / logout ----

async function refreshSession(refreshToken, meta) {
  if (!refreshToken) throw new AppError('Thiếu refresh token', 401, 'UNAUTHENTICATED');

  const tokenHash = sha256(refreshToken);
  const session = await repo.findActiveSessionByHash(tokenHash);
  if (!session || session.expiresAt < new Date()) {
    throw new AppError('Phiên đăng nhập đã hết hạn', 401, 'SESSION_EXPIRED');
  }

  const user = await repo.findUserById(session.userId);
  assertActive(user);

  // Rotation: thu hồi refresh token cũ, phát hành cặp token mới.
  await repo.revokeSession(session.id);
  return issueSession(user, meta);
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  const tokenHash = sha256(refreshToken);
  const session = await repo.findActiveSessionByHash(tokenHash);
  if (session) await repo.revokeSession(session.id);
}

// ---- Quên mật khẩu ----

async function forgotPassword({ email }) {
  const user = await repo.findUserByEmail(email);
  if (user && !user.deletedAt) {
    const token = generateRandomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + env.passwordReset.ttlMinutes * 60 * 1000);

    await repo.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

    const url = `${env.frontendUrl}/reset-password?token=${token}`;
    await emailService.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu',
      html: passwordResetTemplate({ url }),
      type: 'password_reset',
    });
  }
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = sha256(token);
  const record = await repo.findPasswordResetTokenByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 401, 'INVALID_RESET_TOKEN');
  }

  await repo.markPasswordResetUsed(record.id);
  const passwordHash = await hashPassword(newPassword);
  await repo.updatePasswordHash(record.userId, passwordHash);
}

async function getLoginMethods() {
  return prisma.loginMethodSetting.findMany({ select: { method: true, isEnabled: true } });
}

module.exports = {
  issueSession,
  getLoginMethods,
  register,
  loginWithPassword,
  requestMagicLink,
  verifyMagicLink,
  loginWithGoogle,
  refreshSession,
  logout,
  forgotPassword,
  resetPassword,
};

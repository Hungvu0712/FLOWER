import { OAuth2Client } from 'google-auth-library';
import type { User } from '@prisma/client';
import { AppError } from '../../../core/errors';
import { env } from '../../../config/env';
import { prisma } from '../../../config/prisma';
import { hashPassword, verifyPassword, sha256, generateRandomToken } from '../../../core/utils/hash';
import { signAccessToken } from '../../../core/utils/jwt';
import { emailService } from '../email/email.service';
import { magicLinkTemplate, passwordResetTemplate } from '../email/email.templates';
import * as repo from './auth.repository';
import type { RequestMeta } from './device.util';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.validation';

const googleClient = new OAuth2Client(env.google.clientId);

export type SafeUser = Omit<User, 'passwordHash'>;

export interface AuthSession {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function assertActive(user: User | null): asserts user is User {
  if (!user) throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
  if (user.status === 'blocked') throw new AppError('Tài khoản đã bị khoá', 403, 'ACCOUNT_BLOCKED');
  if (user.deletedAt) throw new AppError('Tài khoản không tồn tại', 401, 'INVALID_CREDENTIALS');
}

async function assertMethodEnabled(method: string, label: string): Promise<void> {
  const enabled = await repo.isLoginMethodEnabled(method);
  if (!enabled) throw new AppError(`${label} hiện đang tắt`, 403, 'LOGIN_METHOD_DISABLED');
}

// ---- Helper dùng chung cho mọi luồng login (password/magic-link/google) ----
export async function issueSession(user: User, meta?: RequestMeta): Promise<AuthSession> {
  // Access token CHỈ chứa sub (định danh) — role/permission được authenticate middleware tra lại từ
  // DB ở mỗi request, không nhúng ở đây. Xem core/utils/jwt.ts.
  const accessToken = signAccessToken({ sub: user.id });

  const refreshToken = generateRandomToken();
  const refreshTokenHash = sha256(refreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);

  await repo.createSession({
    userId: user.id,
    refreshTokenHash,
    ...(meta?.deviceName && { deviceName: meta.deviceName }),
    ...(meta?.ipAddress && { ipAddress: meta.ipAddress }),
    ...(meta?.userAgent && { userAgent: meta.userAgent }),
    expiresAt: refreshTokenExpiresAt,
  });

  return { user: sanitizeUser(user), accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function getLoginMethods() {
  return prisma.loginMethodSetting.findMany({ select: { method: true, isEnabled: true } });
}

// ---- Email + Password ----

// Đăng ký KHÔNG tự động đăng nhập — trả về tài khoản đã tạo, người dùng tự đăng nhập lại ở trang login
// (frontend hiện toast + redirect). Xem auth.controller.ts.
export async function register(input: RegisterInput): Promise<SafeUser> {
  await assertMethodEnabled('email_password', 'Đăng ký bằng email/mật khẩu');

  const existing = await repo.findUserByEmail(input.email);
  if (existing) throw new AppError('Email đã được sử dụng', 409, 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUserWithMemberRole({ fullName: input.fullName, email: input.email, passwordHash });
  return sanitizeUser(user);
}

export async function loginWithPassword(input: LoginInput): Promise<User> {
  await assertMethodEnabled('email_password', 'Đăng nhập bằng email/mật khẩu');

  const user = await repo.findUserByEmail(input.email);
  assertActive(user);

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AppError('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');

  return user;
}

// ---- Magic link (dùng 1 lần, hết hạn ngắn — xem SECURITY.md §1) ----

export async function requestMagicLink(input: { email: string }): Promise<void> {
  await assertMethodEnabled('magic_link', 'Đăng nhập bằng magic link');

  const user = await repo.findUserByEmail(input.email);
  // Không tiết lộ email có tồn tại hay không qua response — luôn trả về thành công.
  if (user && user.status !== 'blocked' && !user.deletedAt) {
    const token = generateRandomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + env.magicLink.ttlMinutes * 60 * 1000);

    await repo.createMagicLinkToken({ email: input.email, userId: user.id, tokenHash, expiresAt });

    const url = `${env.magicLink.baseUrl}?token=${token}`;
    // Nuốt lỗi gửi email tại đây — nếu để văng ra ngoài, response sẽ khác với nhánh "email không tồn
    // tại" (500 thay vì 200 luôn-thành-công), phá vỡ đúng mục đích chống lộ email ở trên. sendEmail() đã
    // tự log lỗi + ghi email_log (status 'failed') nên vẫn quan sát được từ phía server. Xem SECURITY.md §1.
    await emailService
      .sendEmail({ to: input.email, subject: 'Liên kết đăng nhập', html: magicLinkTemplate({ url }), type: 'magic_link' })
      .catch(() => {});
  }
}

export async function verifyMagicLink(token: string): Promise<User> {
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
      fullName: record.email.split('@')[0] ?? record.email,
      email: record.email,
      passwordHash: null,
      emailVerifiedAt: new Date(),
    });
  }

  assertActive(user);
  return user;
}

// ---- Google OAuth (verify ID token do frontend lấy từ Google Identity Services) ----

export async function loginWithGoogle(idToken: string): Promise<User> {
  await assertMethodEnabled('google_oauth', 'Đăng nhập bằng Google');

  // verifyIdToken ném lỗi thô (không phải trả payload rỗng) khi idToken sai định dạng/hết hạn/audience
  // không khớp — bắt lại để trả AppError rõ ràng thay vì để văng thành 500 chung chung.
  const payload = await googleClient
    .verifyIdToken({ idToken, audience: env.google.clientId })
    .then((ticket) => ticket.getPayload())
    .catch(() => null);
  if (!payload?.email) throw new AppError('Không xác thực được tài khoản Google', 401, 'INVALID_GOOGLE_TOKEN');

  const authAccount = await repo.findAuthAccount('google', payload.sub);
  let user: User | null;

  if (authAccount) {
    user = await repo.findUserById(authAccount.userId);
  } else {
    user = await repo.findUserByEmail(payload.email);
    if (!user) {
      user = await repo.createUserWithMemberRole({
        fullName: payload.name || payload.email.split('@')[0] || payload.email,
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

export async function refreshSession(refreshToken: string | undefined, meta?: RequestMeta): Promise<AuthSession> {
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

export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  const tokenHash = sha256(refreshToken);
  const session = await repo.findActiveSessionByHash(tokenHash);
  if (session) await repo.revokeSession(session.id);
}

// ---- Quên mật khẩu ----

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await repo.findUserByEmail(input.email);
  // Không tiết lộ email có tồn tại hay không qua response — luôn trả về thành công (xem controller).
  if (user && !user.deletedAt) {
    const token = generateRandomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + env.passwordReset.ttlMinutes * 60 * 1000);

    await repo.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });

    const url = `${env.frontendUrl}/reset-password?token=${token}`;
    // Nuốt lỗi gửi email — nếu văng ra ngoài, response 500 sẽ khác nhánh "email không tồn tại" (200
    // luôn-thành-công), lộ email nào có tài khoản. sendEmail() đã tự log lỗi + ghi email_log. Xem SECURITY.md §1.
    await emailService
      .sendEmail({ to: input.email, subject: 'Đặt lại mật khẩu', html: passwordResetTemplate({ url }), type: 'password_reset' })
      .catch(() => {});
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256(input.token);
  const record = await repo.findPasswordResetTokenByHash(tokenHash);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError('Liên kết không hợp lệ hoặc đã hết hạn', 401, 'INVALID_RESET_TOKEN');
  }

  await repo.markPasswordResetUsed(record.id);
  const passwordHash = await hashPassword(input.newPassword);
  await repo.updatePasswordHash(record.userId, passwordHash);
}

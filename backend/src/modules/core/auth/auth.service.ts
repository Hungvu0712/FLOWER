import { OAuth2Client } from "google-auth-library";
import type { User } from "@prisma/client";
import { AppError } from "../../../shared/errors";
import { env } from "../../../config/env";
import { prisma } from "../../../config/prisma";
import {
  hashPassword,
  verifyPassword,
  sha256,
  generateRandomToken,
} from "../../../shared/utils/hash";
import { signAccessToken } from "../../../shared/utils/jwt";
import { revokeAllUserSessions } from "../../../shared/utils/revokeSessions";
import { emailService } from "../email/email.service";
import {
  magicLinkTemplate,
  passwordResetTemplate,
  securityAlertTemplate,
} from "../email/email.templates";
import * as auditLog from "../audit-log/auditLog.service";
import * as systemSettings from "../settings/systemSettings.service";
import * as repo from "./auth.repository";
import type { RequestMeta } from "./device.util";
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.validation";

const googleClient = new OAuth2Client(env.google.clientId);

// failedLoginAttempts/lockedUntil (docs/12 BE-17) là chi tiết bảo mật nội bộ, không phải thông tin
// hiển thị cho chính chủ tài khoản — không lộ qua response API, giống nguyên tắc với passwordHash.
export type SafeUser = Omit<User, "passwordHash" | "failedLoginAttempts" | "lockedUntil">;

export interface AuthSession {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, failedLoginAttempts: _a, lockedUntil: _l, ...safe } = user;
  return safe;
}

function assertActive(user: User | null): asserts user is User {
  if (!user) throw new AppError("Email hoặc mật khẩu không đúng", 401, "INVALID_CREDENTIALS");
  if (user.status === "blocked") throw new AppError("Tài khoản đã bị khoá", 403, "ACCOUNT_BLOCKED");
  if (user.deletedAt) throw new AppError("Tài khoản không tồn tại", 401, "INVALID_CREDENTIALS");
}

// docs/12 BE-17: khoá TẠM sau nhiều lần đăng nhập sai liên tiếp (khác `status: 'blocked'` — admin chủ
// động khoá vĩnh viễn). Cooldown tăng dần theo cấp số nhân để làm chậm brute-force kiên trì, có trần
// để không khoá vĩnh viễn nhầm người dùng thật quên mật khẩu.
const LOGIN_LOCKOUT_THRESHOLD = 5; // số lần sai liên tiếp cho phép trước khi bắt đầu khoá
const LOGIN_LOCKOUT_BASE_MINUTES = 1;
const LOGIN_LOCKOUT_MAX_MINUTES = 30;

function computeLockoutMinutes(failedAttempts: number): number {
  const overBy = failedAttempts - LOGIN_LOCKOUT_THRESHOLD; // 0 tại đúng ngưỡng, 1, 2, ... cho lần sau
  return Math.min(LOGIN_LOCKOUT_BASE_MINUTES * 2 ** overBy, LOGIN_LOCKOUT_MAX_MINUTES);
}

// Đặt TRƯỚC bước verify mật khẩu — tài khoản đang khoá thì từ chối ngay, không tốn chi phí bcrypt và
// không cho thêm cơ hội dò trong lúc khoá. Thông điệp tiết lộ tài khoản có tồn tại (giống nhánh
// ACCOUNT_BLOCKED phía trên) — đánh đổi có chủ đích giữa chống brute-force và chống dò email, đúng
// loại đánh đổi OWASP ghi nhận cho tính năng khoá tài khoản; xem docs/07 §1.
function assertNotLocked(user: User): void {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new AppError(
      `Tài khoản tạm khoá do đăng nhập sai nhiều lần. Thử lại sau ${minutesLeft} phút.`,
      429,
      "ACCOUNT_TEMPORARILY_LOCKED",
    );
  }
}

async function assertMethodEnabled(method: string, label: string): Promise<void> {
  const enabled = await repo.isLoginMethodEnabled(method);
  if (!enabled) throw new AppError(`${label} hiện đang tắt`, 403, "LOGIN_METHOD_DISABLED");
}

// docs/12, Phase 4 — khoá TẠO TÀI KHOẢN MỚI (mọi phương thức: email/password, magic-link tự đăng ký,
// Google tự tạo lần đầu), KHÁC với `login_method_settings` (khoá riêng TỪNG phương thức ĐĂNG NHẬP,
// kể cả cho user đã có tài khoản). undefined (chưa seed) → coi như bật, tránh khoá cứng đăng ký nếu
// seed chưa chạy.
async function assertRegistrationEnabled(): Promise<void> {
  const enabled = await systemSettings.getValue("registration_enabled");
  if (enabled === false) {
    throw new AppError("Đăng ký tài khoản mới hiện đang tạm khoá", 403, "REGISTRATION_DISABLED");
  }
}

// ---- Helper dùng chung cho mọi luồng login (password/magic-link/google) ----
export async function issueSession(user: User, meta?: RequestMeta): Promise<AuthSession> {
  // Access token CHỈ chứa sub (định danh) — role/permission được authenticate middleware tra lại từ
  // DB ở mỗi request, không nhúng ở đây. Xem shared/utils/jwt.ts.
  const accessToken = signAccessToken({ sub: user.id });

  const refreshToken = generateRandomToken();
  const refreshTokenHash = sha256(refreshToken);
  const refreshTokenExpiresAt = new Date(
    Date.now() + env.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000,
  );

  await repo.createSession({
    userId: user.id,
    refreshTokenHash,
    ...(meta?.deviceName && { deviceName: meta.deviceName }),
    ...(meta?.ipAddress && { ipAddress: meta.ipAddress }),
    ...(meta?.userAgent && { userAgent: meta.userAgent }),
    expiresAt: refreshTokenExpiresAt,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}

export async function getLoginMethods() {
  return prisma.loginMethodSetting.findMany({
    select: { method: true, isEnabled: true },
  });
}

// ---- Email + Password ----

// Đăng ký KHÔNG tự động đăng nhập — trả về tài khoản đã tạo, người dùng tự đăng nhập lại ở trang login
// (frontend hiện toast + redirect). Xem auth.controller.ts.
export async function register(input: RegisterInput): Promise<SafeUser> {
  await assertMethodEnabled("email_password", "Đăng ký bằng email/mật khẩu");
  await assertRegistrationEnabled();

  const existing = await repo.findUserByEmail(input.email);
  if (existing) throw new AppError("Email đã được sử dụng", 409, "EMAIL_TAKEN");

  const passwordHash = await hashPassword(input.password);
  const user = await repo.createUserWithMemberRole({
    fullName: input.fullName,
    email: input.email,
    passwordHash,
  });
  return sanitizeUser(user);
}

export async function loginWithPassword(input: LoginInput): Promise<User> {
  await assertMethodEnabled("email_password", "Đăng nhập bằng email/mật khẩu");

  const user = await repo.findUserByEmail(input.email);
  assertActive(user);
  assertNotLocked(user);

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const attempts = await repo.incrementFailedLoginAttempts(user.id);
    if (attempts >= LOGIN_LOCKOUT_THRESHOLD) {
      const minutes = computeLockoutMinutes(attempts);
      await repo.lockUserUntil(user.id, new Date(Date.now() + minutes * 60_000));
    }
    throw new AppError("Email hoặc mật khẩu không đúng", 401, "INVALID_CREDENTIALS");
  }

  // Đăng nhập đúng — xoá dấu vết các lần sai trước đó, không để cộng dồn mãi qua các phiên đăng nhập.
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await repo.resetFailedLoginAttempts(user.id);
  }

  return user;
}

// ---- Magic link (dùng 1 lần, hết hạn ngắn — xem docs/07 §1) ----

export async function requestMagicLink(input: { email: string }): Promise<void> {
  await assertMethodEnabled("magic_link", "Đăng nhập bằng magic link");

  const user = await repo.findUserByEmail(input.email);
  // Không tiết lộ email có tồn tại hay không qua response — luôn trả về thành công.
  if (user && user.status !== "blocked" && !user.deletedAt) {
    const token = generateRandomToken();
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + env.magicLink.ttlMinutes * 60 * 1000);

    await repo.createMagicLinkToken({
      email: input.email,
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const url = `${env.magicLink.baseUrl}?token=${token}`;
    // Nuốt lỗi gửi email tại đây — nếu để văng ra ngoài, response sẽ khác với nhánh "email không tồn
    // tại" (500 thay vì 200 luôn-thành-công), phá vỡ đúng mục đích chống lộ email ở trên. sendEmail() đã
    // tự log lỗi + ghi email_log (status 'failed') nên vẫn quan sát được từ phía server. Xem docs/07 §1.
    await emailService
      .sendEmail({
        to: input.email,
        subject: "Liên kết đăng nhập",
        html: magicLinkTemplate({ url }),
        type: "magic_link",
      })
      .catch(() => {});
  }
}

export async function verifyMagicLink(token: string): Promise<User> {
  const tokenHash = sha256(token);
  // consumeMagicLinkToken kiểm tra hợp lệ + đánh dấu đã dùng NGUYÊN TỬ trong 1 câu lệnh (xem
  // auth.repository.ts) — null nghĩa là không tồn tại/đã dùng/đã hết hạn, không phân biệt 3 trường
  // hợp đó với người gọi (đều cùng 1 thông điệp lỗi như trước).
  const record = await repo.consumeMagicLinkToken(tokenHash);
  if (!record) {
    throw new AppError("Liên kết không hợp lệ hoặc đã hết hạn", 401, "INVALID_MAGIC_LINK");
  }

  let user = record.userId
    ? await repo.findUserById(record.userId)
    : await repo.findUserByEmail(record.email);
  if (!user) {
    // Email chưa từng có tài khoản — magic link đóng luôn vai trò "đăng ký nhanh". LƯU Ý: nhánh này
    // hiện KHÔNG reachable qua luồng thật — requestMagicLink() chỉ tạo token khi email đã có tài
    // khoản (xem hàm đó phía trên), nên record.userId luôn có giá trị thật. Giữ nguyên nhánh phòng hờ
    // (và để assertRegistrationEnabled ở đây nếu sau này được nối lại) — xem docs/12 BE-20.
    await assertRegistrationEnabled();
    user = await repo.createUserWithMemberRole({
      fullName: record.email.split("@")[0] ?? record.email,
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
  await assertMethodEnabled("google_oauth", "Đăng nhập bằng Google");

  // verifyIdToken ném lỗi thô (không phải trả payload rỗng) khi idToken sai định dạng/hết hạn/audience
  // không khớp — bắt lại để trả AppError rõ ràng thay vì để văng thành 500 chung chung.
  const payload = await googleClient
    .verifyIdToken({ idToken, audience: env.google.clientId })
    .then((ticket) => ticket.getPayload())
    .catch(() => null);
  if (!payload?.email)
    throw new AppError("Không xác thực được tài khoản Google", 401, "INVALID_GOOGLE_TOKEN");
  // Liên kết theo `payload.email` bên dưới — nếu Google trả email CHƯA XÁC MINH (xảy ra với một số
  // cấu hình Google Workspace), kẻ tấn công tạo được 1 tài khoản Google trỏ tới email của người khác
  // rồi đăng nhập thẳng vào tài khoản đã tồn tại của họ. Xem docs/12 BE-04.
  if (payload.email_verified !== true)
    throw new AppError("Tài khoản Google chưa xác minh email", 401, "GOOGLE_EMAIL_UNVERIFIED");

  const authAccount = await repo.findAuthAccount("google", payload.sub);
  let user: User | null;

  if (authAccount) {
    user = await repo.findUserById(authAccount.userId);
  } else {
    user = await repo.findUserByEmail(payload.email);
    if (!user) {
      await assertRegistrationEnabled();
      user = await repo.createUserWithMemberRole({
        fullName: payload.name || payload.email.split("@")[0] || payload.email,
        email: payload.email,
        passwordHash: null,
        emailVerifiedAt: new Date(),
      });
    }
    await repo.linkAuthAccount({
      userId: user.id,
      provider: "google",
      providerAccountId: payload.sub,
    });
  }

  assertActive(user);
  return user;
}

// ---- Session: refresh / logout ----

export async function refreshSession(
  refreshToken: string | undefined,
  meta?: RequestMeta,
): Promise<AuthSession> {
  if (!refreshToken) throw new AppError("Thiếu refresh token", 401, "UNAUTHENTICATED");

  const tokenHash = sha256(refreshToken);
  const session = await repo.findSessionByHash(tokenHash);

  // Token ĐÃ BỊ THU HỒI (rotation ở lần refresh trước) nhưng vẫn được gửi lên lại — người dùng hợp lệ
  // không bao giờ dùng lại token đã xoay vòng, đây gần như chắc chắn là dấu hiệu token bị đánh cắp.
  // Phản hồi cho client GIỐNG HỆT nhánh "hết hạn" bên dưới (không tiết lộ đã bị phát hiện, tránh kẻ
  // tấn công biết mà đổi chiến thuật) — nhưng phía server thu hồi TOÀN BỘ phiên + ghi audit log + gửi
  // email cảnh báo. Xem docs/12 BE-03.
  if (session?.revokedAt) {
    await revokeAllUserSessions(session.userId);
    await auditLog.record({
      actorId: session.userId,
      action: "auth.refresh_reuse_detected",
      entityType: "session",
      entityId: session.id,
      ...(meta?.ipAddress && { ipAddress: meta.ipAddress }),
    });
    const compromisedUser = await repo.findUserById(session.userId);
    if (compromisedUser) {
      await emailService
        .sendEmail({
          to: compromisedUser.email,
          subject: "Cảnh báo bảo mật: phát hiện đăng nhập bất thường",
          html: securityAlertTemplate({ fullName: compromisedUser.fullName }),
          type: "security_alert",
        })
        .catch(() => {});
    }
  }

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AppError("Phiên đăng nhập đã hết hạn", 401, "SESSION_EXPIRED");
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

    await repo.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const url = `${env.frontendUrl}/reset-password?token=${token}`;
    // Nuốt lỗi gửi email — nếu văng ra ngoài, response 500 sẽ khác nhánh "email không tồn tại" (200
    // luôn-thành-công), lộ email nào có tài khoản. sendEmail() đã tự log lỗi + ghi email_log. Xem docs/07 §1.
    await emailService
      .sendEmail({
        to: input.email,
        subject: "Đặt lại mật khẩu",
        html: passwordResetTemplate({ url }),
        type: "password_reset",
      })
      .catch(() => {});
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = sha256(input.token);
  // consumePasswordResetToken kiểm tra hợp lệ + đánh dấu đã dùng NGUYÊN TỬ trong 1 câu lệnh (xem
  // auth.repository.ts, docs/12 BE-05).
  const record = await repo.consumePasswordResetToken(tokenHash);
  if (!record) {
    throw new AppError("Liên kết không hợp lệ hoặc đã hết hạn", 401, "INVALID_RESET_TOKEN");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await repo.updatePasswordHash(record.userId, passwordHash);
  // Đặt lại mật khẩu qua link email không có "phiên hiện tại" nào để chừa — thu hồi TẤT CẢ. Xem
  // docs/12 BE-01.
  await revokeAllUserSessions(record.userId);
}

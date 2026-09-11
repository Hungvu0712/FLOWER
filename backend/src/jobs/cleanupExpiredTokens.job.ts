import { prisma } from "../config/prisma";
import { logger } from "../shared/logger/logger";

// docs/12 BE-13: magic_link_tokens/password_reset_tokens/sessions trước đây tích tụ vô hạn — token
// hết hạn hay session đã thu hồi/hết hạn không bao giờ bị xoá. Không ảnh hưởng tính đúng đắn (token
// hết hạn/session thu hồi đã bị từ chối ở tầng nghiệp vụ), nhưng bảng phình to vô ích theo thời gian.
// KHÔNG áp dụng cho audit_logs/email_logs — đó là dữ liệu tuân thủ/truy vết, cần chính sách lưu trữ
// lạnh riêng chứ không xoá tuỳ tiện (xem docs/12 BE-13).
const TOKEN_RETENTION_DAYS = 7; // token TTL chỉ 15-30 phút — quá hạn 7 ngày chắc chắn không còn dùng được
const SESSION_RETENTION_DAYS = 30; // giữ lâu hơn để còn tra cứu lịch sử đăng nhập gần đây khi cần

// Chạy hằng ngày (xem jobs/index.ts) — xem docs/05 §3.3, docs/02 §6.
export async function cleanupExpiredTokens(): Promise<void> {
  const tokenCutoff = new Date(Date.now() - TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const sessionCutoff = new Date(Date.now() - SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [magicLinkResult, passwordResetResult, sessionResult] = await Promise.all([
    prisma.magicLinkToken.deleteMany({ where: { expiresAt: { lt: tokenCutoff } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: tokenCutoff } } }),
    // Xoá session ĐÃ HẾT HẠN từ lâu HOẶC ĐÃ BỊ THU HỒI từ lâu (đổi mật khẩu, đăng xuất thủ công...) —
    // cả 2 trường hợp đều không còn dùng được nữa, không cần giữ mãi.
    prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: sessionCutoff } }, { revokedAt: { lt: sessionCutoff } }],
      },
    }),
  ]);

  logger.info(
    `[cleanupExpiredTokens] Xoá ${magicLinkResult.count} magic link token, ` +
      `${passwordResetResult.count} password reset token, ${sessionResult.count} session hết hạn/đã thu hồi.`,
  );
}

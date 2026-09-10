import { env } from "../../../config/env";
import { prisma } from "../../../config/prisma";
import { logger } from "../../../shared/logger/logger";
import { resendProvider } from "./providers/resend.provider";
import { nodemailerProvider } from "./providers/nodemailer.provider";
import type { EmailProvider } from "./email.provider";

// Chọn provider qua biến môi trường — nơi gọi (auth.service, users.admin.service...) không cần biết
// đang chạy Resend hay SMTP. Đổi provider chỉ cần đổi EMAIL_PROVIDER trong .env.
// Xem docs/02 §7.
const provider: EmailProvider =
  env.email.provider === "resend" ? resendProvider : nodemailerProvider;

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  type: string;
}

async function sendEmail({ to, subject, html, type }: SendEmailArgs) {
  try {
    const result = await provider.send({ to, subject, html });
    await prisma.emailLog.create({
      data: {
        toEmail: to,
        type,
        status: "sent",
        providerMessageId: result.providerMessageId,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Gửi email thất bại (type=${type}, to=${to}):`, message);
    await prisma.emailLog
      .create({ data: { toEmail: to, type, status: "failed", error: message } })
      .catch(() => {}); // không để lỗi ghi log email làm crash luồng chính
    throw err;
  }
}

export const emailService = { sendEmail };

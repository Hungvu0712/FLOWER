import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../../../config/env';
import type { EmailProvider, SendEmailInput, SendEmailResult } from '../email.provider';

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.port === 465,
      auth: { user: env.email.smtp.user, pass: env.email.smtp.pass },
    });
  }
  return transporter;
}

// Phương án tạm khi chưa có domain riêng cho Resend — dễ vào spam hơn, xem docs/02 §7.
export const nodemailerProvider: EmailProvider = {
  async send({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
    const info = await getTransporter().sendMail({ from: env.email.from, to, subject, html });
    return { providerMessageId: info.messageId };
  },
};

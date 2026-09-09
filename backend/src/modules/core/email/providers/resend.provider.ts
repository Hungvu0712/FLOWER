import { Resend } from 'resend';
import { env } from '../../../../config/env';
import type { EmailProvider, SendEmailInput, SendEmailResult } from '../email.provider';

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) client = new Resend(env.email.resendApiKey);
  return client;
}

// Resend yêu cầu domain gửi đã được verify (DKIM/SPF) — xem docs/02 §7.
export const resendProvider: EmailProvider = {
  async send({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
    const { data, error } = await getClient().emails.send({ from: env.email.from, to, subject, html });
    if (error) throw new Error(error.message || 'Resend send failed');
    return { providerMessageId: data?.id };
  },
};

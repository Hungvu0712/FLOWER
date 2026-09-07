// Interface chung cho mọi email provider — business logic chỉ biết đến interface này, không gọi
// thẳng Resend/Nodemailer. Đổi provider (Resend ↔ SMTP ↔ sau này SES...) không cần sửa business logic.
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  providerMessageId?: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

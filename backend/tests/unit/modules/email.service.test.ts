import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, resetPrismaMock } from "../../mocks/prisma.mock";
import {
  magicLinkTemplate,
  newPasswordTemplate,
  passwordResetTemplate,
} from "@/modules/core/email/email.templates";

vi.mock("@/modules/core/email/providers/nodemailer.provider", () => ({
  nodemailerProvider: { send: vi.fn() },
}));
vi.mock("@/modules/core/email/providers/resend.provider", () => ({
  resendProvider: { send: vi.fn() },
}));

const { nodemailerProvider } = await import("@/modules/core/email/providers/nodemailer.provider");
const { emailService } = await import("@/modules/core/email/email.service");

const send = vi.mocked(nodemailerProvider.send);

beforeEach(() => {
  resetPrismaMock();
  send.mockReset();
});

describe("emailService.sendEmail", () => {
  const args = {
    to: "a@example.com",
    subject: "Chào",
    html: "<p>Xin chào</p>",
    type: "magic_link",
  };

  it("chọn provider theo EMAIL_PROVIDER (test đang dùng smtp → nodemailer)", async () => {
    send.mockResolvedValue({ providerMessageId: "m-1" });
    db.emailLog.create.mockResolvedValue({});
    await emailService.sendEmail(args);
    expect(send).toHaveBeenCalledWith({ to: args.to, subject: args.subject, html: args.html });
  });

  it("ghi email_logs với status 'sent' khi gửi thành công", async () => {
    send.mockResolvedValue({ providerMessageId: "m-1" });
    db.emailLog.create.mockResolvedValue({});
    await emailService.sendEmail(args);
    expect(db.emailLog.create.mock.calls[0]![0].data).toMatchObject({
      toEmail: "a@example.com",
      type: "magic_link",
      status: "sent",
      providerMessageId: "m-1",
    });
  });

  it("ghi email_logs với status 'failed' + thông điệp lỗi rồi NÉM LẠI lỗi cho caller quyết định", async () => {
    send.mockRejectedValue(new Error("SMTP timeout"));
    db.emailLog.create.mockResolvedValue({});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(emailService.sendEmail(args)).rejects.toThrow("SMTP timeout");
    expect(db.emailLog.create.mock.calls[0]![0].data).toMatchObject({
      status: "failed",
      error: "SMTP timeout",
    });
  });

  it("lỗi khi ghi email_logs không được làm crash luồng gửi", async () => {
    send.mockRejectedValue(new Error("SMTP chết"));
    db.emailLog.create.mockRejectedValue(new Error("DB chết"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(emailService.sendEmail(args)).rejects.toThrow("SMTP chết"); // lỗi gốc, không phải "DB chết"
  });

  it("KHÔNG ghi nội dung email (html) vào email_logs — có thể chứa token", async () => {
    send.mockResolvedValue({ providerMessageId: "m-1" });
    db.emailLog.create.mockResolvedValue({});
    await emailService.sendEmail({ ...args, html: "<a>https://app/verify?token=BI-MAT</a>" });
    expect(JSON.stringify(db.emailLog.create.mock.calls[0]![0])).not.toContain("BI-MAT");
  });
});

describe("email templates", () => {
  it("magic link template nhúng đúng URL", () => {
    const html = magicLinkTemplate({ url: "https://app.test/magic?token=abc" });
    expect(html).toContain("https://app.test/magic?token=abc");
    expect(html).toContain("1 lần");
  });

  it("password reset template nhúng đúng URL", () => {
    expect(passwordResetTemplate({ url: "https://app.test/reset?token=xyz" })).toContain(
      "https://app.test/reset?token=xyz",
    );
  });

  it("new password template hiển thị mật khẩu và nhắc đổi ngay", () => {
    const html = newPasswordTemplate({ password: "Tam-Thoi-123" });
    expect(html).toContain("Tam-Thoi-123");
    expect(html).toContain("đổi mật khẩu");
  });
});

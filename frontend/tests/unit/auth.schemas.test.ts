import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  magicLinkRequestSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/features/core/auth/auth.schemas";

function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("loginSchema", () => {
  it("chấp nhận input hợp lệ", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "x" }).success).toBe(true);
  });

  it("báo lỗi tiếng Việt khi email sai định dạng", () => {
    expect(firstError(loginSchema.safeParse({ email: "sai", password: "x" }))).toBe("Email không hợp lệ");
  });

  it("bắt buộc nhập mật khẩu", () => {
    expect(firstError(loginSchema.safeParse({ email: "a@example.com", password: "" }))).toBe(
      "Vui lòng nhập mật khẩu",
    );
  });

  it("KHÔNG áp rule độ dài ở màn đăng nhập (mật khẩu cũ có thể ngắn hơn rule hiện tại)", () => {
    expect(loginSchema.safeParse({ email: "a@example.com", password: "123" }).success).toBe(true);
  });
});

describe("registerSchema — phải khớp với backend auth.validation.ts", () => {
  it("yêu cầu mật khẩu tối thiểu 8 ký tự, cùng thông điệp với backend", () => {
    expect(firstError(registerSchema.safeParse({ fullName: "A", email: "a@example.com", password: "1234567" }))).toBe(
      "Mật khẩu tối thiểu 8 ký tự",
    );
    expect(registerSchema.safeParse({ fullName: "A", email: "a@example.com", password: "12345678" }).success).toBe(
      true,
    );
  });

  it("bắt buộc họ tên", () => {
    expect(firstError(registerSchema.safeParse({ fullName: "", email: "a@example.com", password: "12345678" }))).toBe(
      "Vui lòng nhập họ tên",
    );
  });
});

describe("resetPasswordSchema", () => {
  it("áp cùng rule 8 ký tự như lúc đăng ký", () => {
    expect(firstError(resetPasswordSchema.safeParse({ newPassword: "1234567" }))).toBe("Mật khẩu tối thiểu 8 ký tự");
  });
});

describe("magicLinkRequestSchema / forgotPasswordSchema", () => {
  it.each([magicLinkRequestSchema, forgotPasswordSchema])("chỉ yêu cầu email hợp lệ", (schema) => {
    expect(schema.safeParse({ email: "a@example.com" }).success).toBe(true);
    expect(firstError(schema.safeParse({ email: "sai" }))).toBe("Email không hợp lệ");
  });
});

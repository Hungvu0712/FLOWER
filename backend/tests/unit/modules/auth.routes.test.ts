import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { emailKeyGenerator } from "@/modules/core/auth/auth.routes";

function mockRequest(body: unknown, ip = "1.2.3.4"): Request {
  return { body, ip } as unknown as Request;
}

describe("emailKeyGenerator — rate limit theo email, độc lập với IP (docs/12 BE-16)", () => {
  it("có email hợp lệ trong body → dùng email (chuẩn hoá chữ thường) làm khoá", () => {
    expect(emailKeyGenerator(mockRequest({ email: "User@Example.com" }))).toBe("user@example.com");
  });

  it("cắt khoảng trắng thừa quanh email trước khi dùng làm khoá", () => {
    expect(emailKeyGenerator(mockRequest({ email: "  a@b.com  " }))).toBe("a@b.com");
  });

  it("2 IP KHÁC nhau nhưng CÙNG 1 email → cùng 1 khoá rate limit (chặn tấn công đổi IP)", () => {
    const keyFromIpA = emailKeyGenerator(mockRequest({ email: "victim@example.com" }, "1.1.1.1"));
    const keyFromIpB = emailKeyGenerator(mockRequest({ email: "victim@example.com" }, "9.9.9.9"));
    expect(keyFromIpA).toBe(keyFromIpB);
  });

  it("2 email KHÁC nhau → khoá khác nhau (không chặn nhầm người dùng khác)", () => {
    const keyA = emailKeyGenerator(mockRequest({ email: "a@example.com" }));
    const keyB = emailKeyGenerator(mockRequest({ email: "b@example.com" }));
    expect(keyA).not.toBe(keyB);
  });

  it("body không có email (vd lỗi validate) → fallback về IP, không throw", () => {
    expect(emailKeyGenerator(mockRequest({}, "5.5.5.5"))).toBe("5.5.5.5");
  });

  it("email không phải string (payload giả mạo) → fallback về IP, không throw", () => {
    expect(emailKeyGenerator(mockRequest({ email: ["a@b.com"] }, "5.5.5.5"))).toBe("5.5.5.5");
  });
});

import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "@/shared/utils/jwt";

describe("access token", () => {
  it("ký rồi verify lại đúng sub", () => {
    const token = signAccessToken({ sub: "user-123" });
    expect(verifyAccessToken(token).sub).toBe("user-123");
  });

  it("KHÔNG nhúng role/permission vào payload (ARCHITECTURE §10 — RBAC tra DB mỗi request)", () => {
    const payload = jwt.decode(signAccessToken({ sub: "user-123" })) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
    expect(payload).not.toHaveProperty("roles");
    expect(payload).not.toHaveProperty("permissions");
  });

  it("từ chối token ký bằng secret khác", () => {
    const forged = jwt.sign({ sub: "user-123" }, "secret-gia-mao");
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it("từ chối token đã hết hạn", () => {
    const expired = jwt.sign({ sub: "user-123" }, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: "-1s",
    });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it("từ chối chuỗi không phải JWT", () => {
    expect(() => verifyAccessToken("khong-phai-jwt")).toThrow();
  });

  it("gắn hạn sử dụng theo JWT_ACCESS_EXPIRES_IN (mặc định 5 phút)", () => {
    const payload = jwt.decode(signAccessToken({ sub: "u" })) as { iat: number; exp: number };
    expect(payload.exp - payload.iat).toBe(5 * 60);
  });
});

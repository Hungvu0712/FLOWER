import { describe, expect, it } from "vitest";
import { generateRandomToken, hashPassword, sha256, verifyPassword } from "@/shared/utils/hash";

describe("hashPassword / verifyPassword", () => {
  it("hash khác bản rõ và verify đúng mật khẩu", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).not.toBe("matkhau123");
    expect(await verifyPassword("matkhau123", hash)).toBe(true);
  });

  it("từ chối mật khẩu sai", async () => {
    const hash = await hashPassword("matkhau123");
    expect(await verifyPassword("matkhau124", hash)).toBe(false);
  });

  it("dùng bcrypt cost 12 (SECURITY.md §1 yêu cầu ≥ 12)", async () => {
    const hash = await hashPassword("matkhau123");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("hai lần hash cùng mật khẩu cho kết quả khác nhau (có salt)", async () => {
    expect(await hashPassword("matkhau123")).not.toBe(await hashPassword("matkhau123"));
  });

  it("trả false khi hash là null — tài khoản chỉ dùng Google/magic link", async () => {
    expect(await verifyPassword("batky", null)).toBe(false);
  });
});

describe("sha256", () => {
  it("cho ra chuỗi hex 64 ký tự, ổn định với cùng input", () => {
    const hash = sha256("token-abc");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256("token-abc")).toBe(hash);
  });

  it("input khác cho hash khác", () => {
    expect(sha256("a")).not.toBe(sha256("b"));
  });
});

describe("generateRandomToken", () => {
  it("mặc định 32 byte → 64 ký tự hex (SECURITY.md §1 yêu cầu ≥ 32 byte)", () => {
    expect(generateRandomToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mỗi lần gọi cho giá trị khác nhau", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateRandomToken()));
    expect(tokens.size).toBe(50);
  });

  it("nhận được số byte tuỳ chỉnh", () => {
    expect(generateRandomToken(16)).toHaveLength(32);
  });
});

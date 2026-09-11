import type { Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { clearAuthCookies, setAuthCookies } from "@/modules/core/auth/cookie.util";
import { friendlyDeviceName, requestMeta } from "@/modules/core/auth/device.util";

function mockRes() {
  return { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as Response & {
    cookie: ReturnType<typeof vi.fn>;
    clearCookie: ReturnType<typeof vi.fn>;
  };
}

const session = {
  accessToken: "access-abc",
  refreshToken: "refresh-xyz",
  refreshTokenExpiresAt: new Date("2026-10-09T00:00:00.000Z"),
};

describe("setAuthCookies", () => {
  it("đặt cả hai cookie ở chế độ httpOnly", () => {
    const res = mockRes();
    setAuthCookies(res, session);
    for (const call of res.cookie.mock.calls) {
      expect(call[2]).toMatchObject({ httpOnly: true, sameSite: "lax" });
    }
  });

  it("access_token dùng path '/' và maxAge parse từ JWT_ACCESS_EXPIRES_IN", () => {
    const res = mockRes();
    setAuthCookies(res, session);
    const [name, value, opts] = res.cookie.mock.calls[0]!;
    expect(name).toBe("access_token");
    expect(value).toBe("access-abc");
    expect(opts).toMatchObject({ path: "/", maxAge: 5 * 60 * 1000 });
  });

  it("refresh_token dùng path '/api/v1' — đủ rộng để /account/sessions đọc được cookie này", () => {
    const res = mockRes();
    setAuthCookies(res, session);
    const [name, value, opts] = res.cookie.mock.calls[1]!;
    expect(name).toBe("refresh_token");
    expect(value).toBe("refresh-xyz");
    expect(opts).toMatchObject({ path: "/api/v1", expires: session.refreshTokenExpiresAt });
  });

  it("secure = false ở môi trường không phải production", () => {
    const res = mockRes();
    setAuthCookies(res, session);
    expect(res.cookie.mock.calls[0]![2]).toMatchObject({ secure: false });
  });

  it("ném lỗi rõ ràng nếu JWT_ACCESS_EXPIRES_IN sai định dạng", async () => {
    vi.resetModules();
    const original = process.env.JWT_ACCESS_EXPIRES_IN;
    process.env.JWT_ACCESS_EXPIRES_IN = "5 phút";
    try {
      const mod = await import("@/modules/core/auth/cookie.util");
      expect(() => mod.setAuthCookies(mockRes(), session)).toThrow(/không parse được thời hạn/i);
    } finally {
      process.env.JWT_ACCESS_EXPIRES_IN = original;
      vi.resetModules();
    }
  });
});

describe("clearAuthCookies", () => {
  it("xoá đúng cookie với path khớp lúc set (path lệch thì trình duyệt không xoá được)", () => {
    const res = mockRes();
    clearAuthCookies(res);
    expect(res.clearCookie).toHaveBeenCalledWith(
      "access_token",
      expect.objectContaining({ path: "/" }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      "refresh_token",
      expect.objectContaining({ path: "/api/v1" }),
    );
  });
});

describe("friendlyDeviceName", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36", "Chrome trên Windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", "Safari trên macOS"],
    ["Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120.0.0.0", "Edge trên Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0", "Firefox trên Linux"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1", "Safari trên iOS"],
    ["Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0", "Chrome trên Android"],
  ])("rút gọn user-agent thành tên dễ đọc: %s", (ua, expected) => {
    expect(friendlyDeviceName(ua)).toBe(expected);
  });

  it('trả "Unknown device" khi không có user-agent', () => {
    expect(friendlyDeviceName()).toBe("Unknown device");
    expect(friendlyDeviceName("")).toBe("Unknown device");
  });

  it("không vỡ với user-agent lạ", () => {
    expect(friendlyDeviceName("curl/8.4.0")).toBe("Unknown browser trên Unknown OS");
  });
});

describe("requestMeta", () => {
  it("gom user-agent, tên thiết bị và IP từ request", () => {
    const meta = requestMeta({
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120" },
      ip: "203.0.113.7",
    } as never);
    expect(meta).toEqual({
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120",
      deviceName: "Chrome trên Windows",
      ipAddress: "203.0.113.7",
    });
  });

  it("không vỡ khi thiếu header/ip", () => {
    expect(requestMeta({ headers: {} } as never)).toEqual({
      userAgent: "",
      deviceName: "Unknown device",
      ipAddress: "",
    });
  });
});

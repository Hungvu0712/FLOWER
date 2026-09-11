import { afterEach, describe, expect, it, vi } from "vitest";

// env.ts đọc process.env lúc MODULE LOAD (không phải lúc gọi hàm), nên mỗi test phải
// vi.resetModules() + import động lại để bắt được thay đổi process.env của chính test đó.
// Không bao giờ `delete process.env.<key>` cho các biến bắt buộc: `import "dotenv/config"` bên trong
// env.ts sẽ tự điền lại giá trị thật từ file .env của máy dev khi biến đó vắng mặt (dotenv không ghi
// đè biến đã có, nhưng CÓ điền biến đang thiếu) — luôn GHI ĐÈ bằng giá trị test, không xoá.
const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
  vi.resetModules();
});

async function loadEnv() {
  vi.resetModules();
  return import("@/config/env");
}

describe("config/env — validate GIÁ TRỊ, không chỉ sự tồn tại (docs/12 BE-11)", () => {
  it("JWT_ACCESS_SECRET quá ngắn (<32 ký tự) bị từ chối dù có mặt", async () => {
    process.env.JWT_ACCESS_SECRET = "qua-ngan";
    await expect(loadEnv()).rejects.toThrow(/JWT_ACCESS_SECRET/);
  });

  it("DATABASE_URL sai định dạng (không phải URL) bị từ chối", async () => {
    process.env.DATABASE_URL = "khong-phai-url-hop-le";
    await expect(loadEnv()).rejects.toThrow(/DATABASE_URL/);
  });

  it("PORT không phải số dương bị từ chối", async () => {
    process.env.PORT = "-1";
    await expect(loadEnv()).rejects.toThrow();
  });

  it("EMAIL_PROVIDER ngoài 'resend'/'smtp' bị từ chối", async () => {
    process.env.EMAIL_PROVIDER = "sendgrid";
    await expect(loadEnv()).rejects.toThrow();
  });

  it("cấu hình hợp lệ tải thành công với giá trị mặc định đúng (PORT=4000, TRUST_PROXY_HOPS=1)", async () => {
    delete process.env.PORT;
    delete process.env.TRUST_PROXY_HOPS;
    const { env } = await loadEnv();
    expect(env.port).toBe(4000);
    expect(env.trustProxyHops).toBe(1);
  });

  describe("RUN_JOBS — tách cron khỏi tiến trình API (docs/12 OPS-01)", () => {
    it("mặc định false khi không cấu hình — không instance nào tự ý chạy cron", async () => {
      delete process.env.RUN_JOBS;
      const { env } = await loadEnv();
      expect(env.runJobs).toBe(false);
    });

    it("RUN_JOBS=true → env.runJobs = true", async () => {
      process.env.RUN_JOBS = "true";
      const { env } = await loadEnv();
      expect(env.runJobs).toBe(true);
    });

    it("RUN_JOBS=false → env.runJobs = false", async () => {
      process.env.RUN_JOBS = "false";
      const { env } = await loadEnv();
      expect(env.runJobs).toBe(false);
    });

    it("giá trị ngoài 'true'/'false' bị từ chối khởi động", async () => {
      process.env.RUN_JOBS = "yes";
      await expect(loadEnv()).rejects.toThrow(/RUN_JOBS/);
    });
  });

  describe("JWT_REFRESH_EXPIRES_IN đọc THẬT từ env (docs/12 BE-15)", () => {
    it("mặc định 30d → refreshExpiresInDays = 30 khi không cấu hình", async () => {
      delete process.env.JWT_REFRESH_EXPIRES_IN;
      const { env } = await loadEnv();
      expect(env.jwt.refreshExpiresInDays).toBe(30);
    });

    it("đổi giá trị env → refreshExpiresInDays đổi theo, KHÔNG còn hard-code 30", async () => {
      process.env.JWT_REFRESH_EXPIRES_IN = "7d";
      const { env } = await loadEnv();
      expect(env.jwt.refreshExpiresInDays).toBe(7);
    });

    it("sai định dạng (không phải '<số>d') bị từ chối khởi động", async () => {
      process.env.JWT_REFRESH_EXPIRES_IN = "30";
      await expect(loadEnv()).rejects.toThrow(/JWT_REFRESH_EXPIRES_IN/);
    });

    it("đơn vị khác 'd' (vd giờ/phút) bị từ chối — chỉ hỗ trợ đơn vị ngày", async () => {
      process.env.JWT_REFRESH_EXPIRES_IN = "720h";
      await expect(loadEnv()).rejects.toThrow(/JWT_REFRESH_EXPIRES_IN/);
    });
  });

  describe("kiểm tra bổ sung khi NODE_ENV=production", () => {
    it("từ chối khởi động nếu COOKIE_SECRET vẫn là giá trị mặc định 'dev-only-secret'", async () => {
      process.env.NODE_ENV = "production";
      process.env.COOKIE_SECRET = "dev-only-secret";
      await expect(loadEnv()).rejects.toThrow(/COOKIE_SECRET/);
    });

    it("từ chối khởi động nếu JWT_ACCESS_SECRET và JWT_REFRESH_SECRET trùng nhau", async () => {
      process.env.NODE_ENV = "production";
      const sameSecret = "a".repeat(40);
      process.env.JWT_ACCESS_SECRET = sameSecret;
      process.env.JWT_REFRESH_SECRET = sameSecret;
      await expect(loadEnv()).rejects.toThrow(/JWT_ACCESS_SECRET.*JWT_REFRESH_SECRET|trùng nhau/);
    });

    it("cấu hình production hợp lệ (secret khác mặc định, 2 secret khác nhau) KHÔNG bị chặn", async () => {
      process.env.NODE_ENV = "production";
      process.env.COOKIE_SECRET = "cookie-secret-that-la-that-khong-phai-mac-dinh";
      process.env.JWT_ACCESS_SECRET = "a".repeat(40);
      process.env.JWT_REFRESH_SECRET = "b".repeat(40);
      const { env } = await loadEnv();
      expect(env.isProd).toBe(true);
    });

    it("KHÔNG áp dụng kiểm tra bổ sung ở môi trường dev/test — giá trị mặc định vẫn chạy được", async () => {
      process.env.NODE_ENV = "test";
      process.env.COOKIE_SECRET = "dev-only-secret";
      const { env } = await loadEnv();
      expect(env.isProd).toBe(false);
      expect(env.cookieSecret).toBe("dev-only-secret");
    });
  });
});

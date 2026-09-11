import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "@/app";
import { resetPrismaMock } from "../mocks/prisma.mock";

beforeEach(() => resetPrismaMock());

describe("GET /health", () => {
  it("trả 200 và nằm NGOÀI versioning (load balancer cần path cố định)", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok" } });
  });

  it("không cần đăng nhập", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
  });
});

describe("Middleware hạ tầng", () => {
  it("gắn X-Request-Id vào mọi response", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("tôn trọng X-Request-Id do client gửi lên (trace xuyên hệ thống)", async () => {
    const res = await request(app).get("/health").set("X-Request-Id", "trace-abc");
    expect(res.headers["x-request-id"]).toBe("trace-abc");
  });

  it("helmet đặt security header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });

  it("CORS chỉ cho phép đúng FRONTEND_URL, không dùng '*' khi có credentials", async () => {
    const allowed = await request(app).get("/health").set("Origin", "http://localhost:3000");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const evil = await request(app).get("/health").set("Origin", "https://ke-tan-cong.example");
    expect(evil.headers["access-control-allow-origin"]).not.toBe("https://ke-tan-cong.example");
  });

  it("giới hạn kích thước body 1MB (chống DoS bằng payload khổng lồ)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // lỗi này được log ở server, không cần in ra test output
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a@example.com", password: "x".repeat(2 * 1024 * 1024) }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });
});

describe("Trust proxy (docs/12 BE-02)", () => {
  it("KHÔNG bật trust proxy ở môi trường test/dev (không có reverse proxy nào phía trước)", () => {
    expect(app.get("trust proxy")).toBe(false);
  });

  it("bật trust proxy đúng số hop TRUST_PROXY_HOPS khi NODE_ENV=production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalHops = process.env.TRUST_PROXY_HOPS;
    process.env.NODE_ENV = "production";
    process.env.TRUST_PROXY_HOPS = "2";
    vi.resetModules();
    try {
      const { app: prodApp } = await import("@/app");
      expect(prodApp.get("trust proxy")).toBe(2);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalHops === undefined) delete process.env.TRUST_PROXY_HOPS;
      else process.env.TRUST_PROXY_HOPS = originalHops;
      vi.resetModules();
    }
  });
});

describe("OpenAPI/Swagger (docs/12 BE-12) — ngoài versioning, giống /health", () => {
  it("GET /openapi.json trả document hợp lệ, không cần đăng nhập", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.0.0");
    expect(res.body.paths["/api/v1/auth/login"]).toBeDefined();
  });

  it("GET /docs trả trang Swagger UI (HTML), không cần đăng nhập", async () => {
    const res = await request(app).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
  });
});

describe("404 handler", () => {
  it("endpoint không tồn tại → 404 theo đúng envelope chuẩn", async () => {
    const res = await request(app).get("/api/v1/khong-ton-tai");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Không tìm thấy endpoint",
      code: "NOT_FOUND",
    });
  });

  it("route ngoài /api/v1 cũng rơi vào 404 handler", async () => {
    expect((await request(app).get("/khong-co-gi")).status).toBe(404);
  });
});

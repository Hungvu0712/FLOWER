import type { AxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "@/lib/axios";

// Không dùng thư viện mock adapter — thay thẳng `adapter` của axios instance để kiểm soát hoàn toàn
// từng lượt request. Đây là cách kiểm thử interceptor mà không cần server thật.
type Handler = (config: AxiosRequestConfig) => Promise<unknown>;

let handler: Handler;
const calls: string[] = [];

function respond(status: number, data: unknown = {}) {
  return (config: AxiosRequestConfig) => {
    const response = { data, status, statusText: "", headers: {}, config };
    return status >= 200 && status < 300
      ? Promise.resolve(response)
      : Promise.reject(Object.assign(new Error(`Request failed with status ${status}`), { config, response, isAxiosError: true }));
  };
}

beforeEach(() => {
  calls.length = 0;
  api.defaults.adapter = (async (config: AxiosRequestConfig) => {
    calls.push(`${(config.method ?? "get").toUpperCase()} ${config.url}`);
    return handler(config);
  }) as never;
});

describe("cấu hình instance", () => {
  it("bật withCredentials để trình duyệt tự gửi cookie httpOnly", () => {
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("baseURL lấy từ NEXT_PUBLIC_API_URL", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:4000");
  });
});

describe("interceptor tự refresh khi gặp 401", () => {
  it("refresh xong thì RETRY request gốc và trả kết quả (không treo promise)", async () => {
    let meCallCount = 0;
    handler = (config) => {
      if (config.url?.includes("/auth/refresh")) return respond(200)(config);
      meCallCount += 1;
      return meCallCount === 1 ? respond(401)(config) : respond(200, { data: { id: "u1" } })(config);
    };

    const res = await api.get("/api/v1/account/me");

    expect(res.data).toEqual({ data: { id: "u1" } });
    expect(calls).toEqual([
      "GET /api/v1/account/me",
      "POST /api/v1/auth/refresh",
      "GET /api/v1/account/me",
    ]);
  });

  it("nhiều request 401 cùng lúc chỉ gọi refresh MỘT lần (xếp hàng chờ)", async () => {
    const seen: Record<string, number> = {};
    handler = (config) => {
      if (config.url?.includes("/auth/refresh")) return respond(200)(config);
      const url = config.url!;
      seen[url] = (seen[url] ?? 0) + 1;
      return seen[url] === 1 ? respond(401)(config) : respond(200, { ok: url })(config);
    };

    const results = await Promise.all([
      api.get("/api/v1/account/me"),
      api.get("/api/v1/account/sessions"),
      api.get("/api/v1/admin/categories"),
    ]);

    expect(results.map((r) => r.data)).toEqual([
      { ok: "/api/v1/account/me" },
      { ok: "/api/v1/account/sessions" },
      { ok: "/api/v1/admin/categories" },
    ]);
    expect(calls.filter((c) => c.includes("/auth/refresh"))).toHaveLength(1);
  });

  it("refresh thất bại → trả 401 cho caller, KHÔNG tự redirect (khách vãng lai ở trang public là bình thường)", async () => {
    handler = (config) => respond(401)(config);
    await expect(api.get("/api/v1/account/me")).rejects.toMatchObject({ response: { status: 401 } });
  });

  it("KHÔNG refresh cho chính endpoint /auth/* (tránh lặp vô hạn)", async () => {
    handler = (config) => respond(401)(config);
    await expect(api.post("/api/v1/auth/login", {})).rejects.toBeDefined();
    expect(calls).toEqual(["POST /api/v1/auth/login"]);
  });

  it("chỉ thử refresh MỘT lần cho mỗi request (không lặp vô hạn khi vẫn 401 sau refresh)", async () => {
    handler = (config) => (config.url?.includes("/auth/refresh") ? respond(200)(config) : respond(401)(config));
    await expect(api.get("/api/v1/account/me")).rejects.toBeDefined();
    expect(calls.filter((c) => c.includes("/auth/refresh"))).toHaveLength(1);
  });

  it("lỗi khác 401 (403, 500) được trả thẳng, không kích hoạt refresh", async () => {
    for (const status of [403, 404, 409, 500]) {
      calls.length = 0;
      handler = (config) => respond(status)(config);
      await expect(api.get("/api/v1/superadmin/users")).rejects.toMatchObject({ response: { status } });
      expect(calls).toEqual(["GET /api/v1/superadmin/users"]);
    }
  });

  it("request thành công đi thẳng, không đụng interceptor lỗi", async () => {
    handler = (config) => respond(200, { success: true })(config);
    expect((await api.get("/api/v1/categories")).data).toEqual({ success: true });
    expect(calls).toHaveLength(1);
  });
});

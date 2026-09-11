import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registerRoute } from "@/openapi/components";
import { registry } from "@/openapi/registry";

// Test file riêng → registry singleton là bản MỚI cho riêng file này (vitest cô lập module graph theo
// từng test file), không đụng tới các *.openapi.ts thật của app — an toàn để đăng ký route giả ở đây.
function generate() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: { title: "test", version: "0.0.0" },
  });
}

describe("openapi/components — registerRoute() helper (docs/12 BE-12)", () => {
  it("route công khai (auth: false) → security: [], KHÔNG tự thêm 401", () => {
    registerRoute({
      method: "get",
      path: "/test/public",
      tags: ["Test"],
      summary: "public",
      auth: false,
      response: { schema: z.null() },
    });
    const op = generate().paths?.["/test/public"]?.get;
    expect(op?.security).toEqual([]);
    expect(op?.responses?.["401"]).toBeUndefined();
  });

  it("route auth: {} (cần đăng nhập, không permission cụ thể) → security có, KHÔNG có 403 tự động", () => {
    registerRoute({
      method: "get",
      path: "/test/authed",
      tags: ["Test"],
      summary: "authed",
      auth: {},
      response: { schema: z.null() },
    });
    const op = generate().paths?.["/test/authed"]?.get;
    expect(op?.security).toEqual([{ cookieAuth: [] }, { bearerAuth: [] }]);
    expect(op?.responses?.["401"]).toBeDefined();
    expect(op?.responses?.["403"]).toBeUndefined();
  });

  it("route auth: {permission} → có 401 VÀ 403, mô tả có ghi rõ permission", () => {
    registerRoute({
      method: "delete",
      path: "/test/permissioned",
      tags: ["Test"],
      summary: "permissioned",
      auth: { permission: "test.manage" },
      response: { schema: z.null() },
    });
    const op = generate().paths?.["/test/permissioned"]?.delete;
    expect(op?.responses?.["401"]).toBeDefined();
    expect(op?.responses?.["403"]).toBeDefined();
    expect(op?.description).toContain("test.manage");
  });

  it("có request.body/query/params → tự thêm response 422", () => {
    registerRoute({
      method: "post",
      path: "/test/with-body",
      tags: ["Test"],
      summary: "with body",
      auth: false,
      request: { body: z.object({ name: z.string() }) },
      response: { schema: z.null() },
    });
    const op = generate().paths?.["/test/with-body"]?.post;
    expect(op?.responses?.["422"]).toBeDefined();
  });

  it("không có request nào → KHÔNG tự thêm 422", () => {
    registerRoute({
      method: "post",
      path: "/test/no-body",
      tags: ["Test"],
      summary: "no body",
      auth: false,
      response: { schema: z.null() },
    });
    const op = generate().paths?.["/test/no-body"]?.post;
    expect(op?.responses?.["422"]).toBeUndefined();
  });

  it("response.paginated bọc data thành mảng + thêm meta phân trang", () => {
    registerRoute({
      method: "get",
      path: "/test/paginated",
      tags: ["Test"],
      summary: "paginated",
      auth: false,
      response: { schema: z.object({ id: z.string() }), paginated: true },
    });
    const schema = generate().paths?.["/test/paginated"]?.get?.responses?.["200"]?.content?.[
      "application/json"
    ]?.schema as { properties?: { data?: { type?: string }; meta?: { $ref?: string } } };
    expect(schema?.properties?.data?.type).toBe("array");
    expect(schema?.properties?.meta?.$ref).toContain("PaginationMeta");
  });

  it("bỏ trống response.schema → data: null (vd logout, refresh không có payload cụ thể)", () => {
    registerRoute({
      method: "post",
      path: "/test/no-payload",
      tags: ["Test"],
      summary: "no payload",
      auth: false,
      response: {},
    });
    const schema = generate().paths?.["/test/no-payload"]?.post?.responses?.["200"]?.content?.[
      "application/json"
    ]?.schema as { properties?: { data?: { nullable?: boolean } } };
    expect(schema?.properties?.data).toBeDefined();
  });

  it("extraStatuses thêm đúng mã lỗi nghiệp vụ riêng (vd 409)", () => {
    registerRoute({
      method: "post",
      path: "/test/conflict",
      tags: ["Test"],
      summary: "conflict",
      auth: false,
      response: { schema: z.null() },
      extraStatuses: [409],
    });
    const op = generate().paths?.["/test/conflict"]?.post;
    expect(op?.responses?.["409"]).toBeDefined();
  });

  it("response.status tuỳ chỉnh (vd 201 khi tạo mới) thay vì mặc định 200", () => {
    registerRoute({
      method: "post",
      path: "/test/created",
      tags: ["Test"],
      summary: "created",
      auth: false,
      response: { status: 201, schema: z.null() },
    });
    const op = generate().paths?.["/test/created"]?.post;
    expect(op?.responses?.["200"]).toBeUndefined();
    expect(op?.responses?.["201"]).toBeDefined();
  });
});

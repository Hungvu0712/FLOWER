import { describe, expect, it } from "vitest";
import { generateOpenApiDocument } from "@/openapi/generate";

// docs/12 BE-12 — không test lại NỘI DUNG từng zod schema (đã có unit test riêng ở tests/unit/modules/
// *.validation quan trọng, và chính là zod schema thật — không copy). Test ở đây chỉ đảm bảo CƠ CHẾ
// sinh document không vỡ, và các bất biến chung (mọi route cần login đều có security, response đúng
// envelope) — vì đây là phần dễ hỏng âm thầm khi thêm module mới mà quên import vào generate.ts.
describe("openapi/generate — sinh document OpenAPI từ registry", () => {
  it("sinh document không lỗi, đúng metadata cơ bản", () => {
    const doc = generateOpenApiDocument();
    expect(doc.openapi).toBe("3.0.0");
    expect(doc.info.title).toBe("Hoa Xinh API");
    expect(doc.paths).toBeDefined();
  });

  it("đăng ký đủ 63 endpoint thật trong *.routes.ts (63 = số route grep được ở 18 file .routes.ts)", () => {
    const doc = generateOpenApiDocument();
    const operationCount = Object.values(doc.paths ?? {}).reduce(
      (sum, pathItem) => sum + Object.keys(pathItem as object).length,
      0,
    );
    // Con số này PHẢI cập nhật khi thêm/bớt route thật — cố ý pin cứng để bắt được trường hợp quên
    // import module mới vào src/openapi/generate.ts (registry rỗng cho module đó, không throw lỗi gì).
    expect(operationCount).toBe(63);
  });

  it("route công khai (vd auth/login) có security: [] — không yêu cầu đăng nhập", () => {
    const doc = generateOpenApiDocument();
    const login = doc.paths?.["/api/v1/auth/login"]?.post;
    expect(login?.security).toEqual([]);
  });

  it("route cần đăng nhập (vd account/me) có security cookieAuth/bearerAuth", () => {
    const doc = generateOpenApiDocument();
    const me = doc.paths?.["/api/v1/account/me"]?.get;
    expect(me?.security).toEqual([{ cookieAuth: [] }, { bearerAuth: [] }]);
  });

  it("route có body/query/params thì có response 422 dùng ValidationErrorResponse", () => {
    const doc = generateOpenApiDocument();
    const register = doc.paths?.["/api/v1/auth/register"]?.post;
    expect(register?.responses?.["422"]).toBeDefined();
  });

  it("route có permission cụ thể (vd superadmin/users) có response 403", () => {
    const doc = generateOpenApiDocument();
    const listUsers = doc.paths?.["/api/v1/superadmin/users"]?.get;
    expect(listUsers?.responses?.["403"]).toBeDefined();
    expect(listUsers?.description).toContain("users.manage");
  });

  it("route phân trang trả response bọc data mảng + meta (PaginationMeta)", () => {
    const doc = generateOpenApiDocument();
    const listProducts = doc.paths?.["/api/v1/products"]?.get;
    const schema = listProducts?.responses?.["200"]?.content?.["application/json"]?.schema as {
      properties?: { data?: { type?: string }; meta?: { $ref?: string } };
    };
    expect(schema?.properties?.data?.type).toBe("array");
    expect(schema?.properties?.meta?.$ref).toContain("PaginationMeta");
  });

  it("registerComponent đăng ký đủ 2 security scheme cookieAuth và bearerAuth", () => {
    const doc = generateOpenApiDocument();
    expect(Object.keys(doc.components?.securitySchemes ?? {}).sort()).toEqual([
      "bearerAuth",
      "cookieAuth",
    ]);
  });
});

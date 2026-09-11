import { z, type AnyZodObject, type ZodTypeAny } from "zod";
import type { ResponseConfig, RouteConfig } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

// docs/06 §1 — 2 cách xác thực: cookie httpOnly (trình duyệt tự gửi) hoặc header Bearer (client khác).
// `security: [{cookieAuth: []}, {bearerAuth: []}]` nghĩa là "1 trong 2 cách đều được" (OR, không phải
// AND) — đúng ngữ nghĩa OpenAPI khi security là MẢNG các object.
registry.registerComponent("securitySchemes", "cookieAuth", {
  type: "apiKey",
  in: "cookie",
  name: "access_token",
  description: "JWT access token trong cookie `httpOnly` — trình duyệt tự đính kèm.",
});
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Dùng cho client không phải trình duyệt: header `Authorization: Bearer <access_token>`.",
});
// [{cookieAuth: []}, {bearerAuth: []}] khớp shape SecurityRequirementObject[] của openapi3-ts (không
// import trực tiếp package đó — dependency GIÁN TIẾP qua zod-to-openapi, không khai trong package.json
// của dự án, tránh phụ thuộc vào việc npm có hoist hay không).
const AUTH_SECURITY: Array<Record<string, string[]>> = [{ cookieAuth: [] }, { bearerAuth: [] }];

// Response envelope thống nhất — khớp CHÍNH XÁC shared/response/ApiResponse.ts và
// shared/middleware/errorHandler.ts, không phải suy đoán riêng.
export const paginationMetaSchema = registry.register(
  "PaginationMeta",
  z
    .object({
      page: z.number().int().openapi({ example: 1 }),
      limit: z.number().int().openapi({ example: 20 }),
      total: z.number().int().openapi({ example: 42 }),
      totalPages: z.number().int().openapi({ example: 3 }),
    })
    .openapi("PaginationMeta"),
);

export const errorResponseSchema = registry.register(
  "ErrorResponse",
  z
    .object({
      success: z.literal(false),
      message: z.string().openapi({ example: "Đã có lỗi xảy ra" }),
      code: z.string().optional().openapi({ example: "NOT_FOUND" }),
    })
    .openapi("ErrorResponse"),
);

export const validationErrorResponseSchema = registry.register(
  "ValidationErrorResponse",
  z
    .object({
      success: z.literal(false),
      message: z.string().openapi({ example: "Validation failed" }),
      errors: z.record(z.string()).openapi({ example: { email: "Email không hợp lệ" } }),
    })
    .openapi("ValidationErrorResponse"),
);

function successEnvelope<T extends ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });
}

function paginatedEnvelope<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });
}

// Mô tả mặc định cho các mã lỗi hay lặp lại — registerRoute() tự thêm response tương ứng dựa trên
// `auth`/`request`/`extraStatuses`, không phải liệt kê tay ở từng endpoint (61 endpoint sẽ rất dài
// dòng nếu lặp lại các khối 401/403/422 giống hệt nhau mỗi lần).
const STATUS_DESCRIPTIONS: Record<number, string> = {
  400: "Yêu cầu không hợp lệ",
  401: "Chưa đăng nhập hoặc token không hợp lệ/hết hạn",
  403: "Không đủ quyền thực hiện thao tác này",
  404: "Không tìm thấy",
  409: "Xung đột dữ liệu (vd trùng khoá, đang được tham chiếu)",
  422: "Dữ liệu gửi lên không hợp lệ",
  429: "Vượt quá giới hạn tần suất (rate limit)",
};

function errorResponseFor(status: number): ResponseConfig {
  return {
    description: STATUS_DESCRIPTIONS[status] ?? "Lỗi",
    content: {
      "application/json": {
        schema: status === 422 ? validationErrorResponseSchema : errorResponseSchema,
      },
    },
  };
}

type HttpMethod = "get" | "post" | "patch" | "put" | "delete";

export interface RegisterRouteConfig {
  method: HttpMethod;
  /** Dạng OpenAPI, vd "/api/v1/admin/products/{id}" — KHÔNG phải cú pháp Express ":id". */
  path: string;
  tags: string[];
  summary: string;
  /** Ghi chú thêm (vd ràng buộc nghiệp vụ) — quyền yêu cầu đã tự thêm vào cuối, không cần lặp lại. */
  description?: string;
  /** false = endpoint công khai. object = cần đăng nhập, `permission` tuỳ chọn nếu cần thêm authorize(). */
  auth: false | { permission?: string };
  request?: {
    body?: ZodTypeAny;
    query?: AnyZodObject;
    params?: AnyZodObject;
  };
  response: {
    status?: number;
    description?: string;
    /** Bỏ trống = "data: null" (vd logout, refresh — không có payload cụ thể để mô tả). */
    schema?: ZodTypeAny;
    /** true = bọc data thành mảng + trả thêm `meta` phân trang (paginated() ở ApiResponse.ts). */
    paginated?: boolean;
  };
  /** Mã lỗi nghiệp vụ riêng của endpoint này, vd 404/409/429 — 401/403/422 đã tự suy ra ở trên. */
  extraStatuses?: number[];
}

// Điểm DUY NHẤT gọi registry.registerPath() trong toàn bộ codebase — mọi `<module>.openapi.ts` gọi
// qua đây thay vì tự dựng lại response envelope/security mỗi lần, đảm bảo 61 endpoint đồng nhất tuyệt
// đối về shape response thành công/lỗi (đúng tinh thần BE-12: sinh từ 1 nguồn, không thể lệch).
export function registerRoute(config: RegisterRouteConfig): void {
  const successStatus = config.response.status ?? 200;
  const successSchema = config.response.paginated
    ? paginatedEnvelope(config.response.schema ?? z.unknown())
    : successEnvelope(config.response.schema ?? z.null());

  const responses: RouteConfig["responses"] = {
    [successStatus]: {
      description: config.response.description ?? "Thành công",
      content: { "application/json": { schema: successSchema } },
    },
  };

  const statuses = new Set<number>(config.extraStatuses ?? []);
  if (config.request?.body || config.request?.query || config.request?.params) statuses.add(422);
  if (config.auth !== false) statuses.add(401);
  if (config.auth && config.auth.permission) statuses.add(403);
  for (const status of statuses) responses[status] = errorResponseFor(status);

  const request: RouteConfig["request"] = {};
  if (config.request?.body) {
    request.body = { content: { "application/json": { schema: config.request.body } } };
  }
  if (config.request?.query) request.query = config.request.query;
  if (config.request?.params) request.params = config.request.params;

  const permissionNote =
    config.auth && config.auth.permission ? `Yêu cầu quyền \`${config.auth.permission}\`.` : undefined;

  registry.registerPath({
    method: config.method,
    path: config.path,
    tags: config.tags,
    summary: config.summary,
    description: [config.description, permissionNote].filter(Boolean).join("\n\n") || undefined,
    security: config.auth !== false ? AUTH_SECURITY : [],
    request: Object.keys(request).length > 0 ? request : undefined,
    responses,
  });
}

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { asyncHandler } from "@/shared/middleware/asyncHandler";
import { authorize } from "@/shared/middleware/authorize";
import { errorHandler } from "@/shared/middleware/errorHandler";
import { requestId } from "@/shared/middleware/requestId";
import { validate } from "@/shared/middleware/validate";
import { AppError, ValidationError } from "@/shared/errors";
import { logger } from "@/shared/logger/logger";

// docs/12 BE-18: logger đổi sang pino, không còn gọi console.error trực tiếp — test log "còn ghi lại
// lỗi để điều tra" giờ spy thẳng vào logger.withRequestId(...).error thay vì console.error.
function spyOnLoggerError() {
  const errorSpy = vi.fn();
  vi.spyOn(logger, "withRequestId").mockReturnValue({
    error: errorSpy,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  });
  return errorSpy;
}

function mockReqRes() {
  const req = {
    headers: {},
    body: {},
    query: {},
    params: {},
    requestId: "req-1",
  } as unknown as Request;
  const res = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
  const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  return { req, res, next };
}

describe("asyncHandler", () => {
  it("chuyển Promise reject sang next(err) thay vì để crash tiến trình", async () => {
    const { req, res, next } = mockReqRes();
    const boom = new AppError("nổ", 400, "BOOM");
    asyncHandler(async () => {
      throw boom;
    })(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(boom));
  });

  it("không gọi next khi handler chạy trót lọt", async () => {
    const { req, res, next } = mockReqRes();
    const handler = vi.fn().mockResolvedValue(undefined);
    asyncHandler(handler)(req, res, next);
    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
    expect(next).not.toHaveBeenCalled();
  });

  it("bắt cả lỗi ném đồng bộ bên trong handler async", async () => {
    const { req, res, next } = mockReqRes();
    asyncHandler((async () => {
      throw new TypeError("lỗi lập trình");
    }) as never)(req, res, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(TypeError)));
  });
});

describe("authorize", () => {
  it("cho qua khi có đủ tất cả permission yêu cầu", () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: "u1", roles: ["admin"], permissions: ["a.x", "b.y", "c.z"] };
    authorize("a.x", "b.y")(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("chặn 403 khi thiếu DÙ CHỈ MỘT permission", () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: "u1", roles: ["admin"], permissions: ["a.x"] };
    authorize("a.x", "b.y")(req, res, next);
    const err = next.mock.calls[0]![0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("trả 401 khi chưa đăng nhập (req.user chưa được gắn)", () => {
    const { req, res, next } = mockReqRes();
    authorize("a.x")(req, res, next);
    const err = next.mock.calls[0]![0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
  });

  it("KHÔNG dựa vào role — super_admin thiếu permission vẫn bị chặn (permission-based RBAC)", () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: "u1", roles: ["super_admin"], permissions: [] };
    authorize("users.manage")(req, res, next);
    expect((next.mock.calls[0]![0] as AppError).statusCode).toBe(403);
  });
});

describe("validate", () => {
  it("gán ngược giá trị đã coerce vào req (query string '2' → number 2)", () => {
    const { req, res, next } = mockReqRes();
    req.query = { page: "2", limit: "50" } as never;
    validate({ query: z.object({ page: z.coerce.number(), limit: z.coerce.number() }) })(
      req,
      res,
      next,
    );
    expect(req.query).toEqual({ page: 2, limit: 50 });
    expect(next).toHaveBeenCalledWith();
  });

  it("áp giá trị mặc định khi client không gửi", () => {
    const { req, res, next } = mockReqRes();
    validate({ query: z.object({ page: z.coerce.number().default(1) }) })(req, res, next);
    expect(req.query).toEqual({ page: 1 });
  });

  it("gom lỗi zod thành ValidationError theo từng field", () => {
    const { req, res, next } = mockReqRes();
    req.body = { email: "sai", password: "123" };
    validate({
      body: z.object({
        email: z.string().email("Email không hợp lệ"),
        password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
      }),
    })(req, res, next);
    const err = next.mock.calls[0]![0] as ValidationError;
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errors).toEqual({
      email: "Email không hợp lệ",
      password: "Mật khẩu tối thiểu 8 ký tự",
    });
  });

  it("chỉ giữ lỗi ĐẦU TIÊN của mỗi field (UI chỉ hiện được một dòng dưới mỗi ô nhập)", () => {
    const { req, res, next } = mockReqRes();
    req.body = { code: "" };
    validate({
      body: z.object({
        code: z
          .string()
          .min(3, "Quá ngắn")
          .regex(/^[a-z]+$/, "Chỉ chữ thường"),
      }),
    })(req, res, next);
    expect((next.mock.calls[0]![0] as ValidationError).errors).toEqual({ code: "Quá ngắn" });
  });

  it("dùng khoá _root cho lỗi không gắn với field cụ thể", () => {
    const { req, res, next } = mockReqRes();
    req.body = "chuỗi thay vì object" as never;
    validate({ body: z.object({ a: z.string() }) })(req, res, next);
    expect(Object.keys((next.mock.calls[0]![0] as ValidationError).errors)).toEqual(["_root"]);
  });
});

describe("requestId", () => {
  it("sinh UUID mới và trả về qua header X-Request-Id", () => {
    const { req, res, next } = mockReqRes();
    requestId(req, res, next);
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it("tôn trọng X-Request-Id do client/proxy gửi lên (trace xuyên hệ thống)", () => {
    const { req, res, next } = mockReqRes();
    req.headers["x-request-id"] = "trace-tu-proxy";
    requestId(req, res, next);
    expect(req.requestId).toBe("trace-tu-proxy");
  });

  it("bỏ qua header rỗng và tự sinh ID", () => {
    const { req, res, next } = mockReqRes();
    req.headers["x-request-id"] = "";
    requestId(req, res, next);
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("errorHandler", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("ValidationError → 422 kèm errors theo field", () => {
    const { req, res, next } = mockReqRes();
    errorHandler(new ValidationError({ email: "Email không hợp lệ" }), req, res, next);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: { email: "Email không hợp lệ" },
    });
  });

  it("AppError → đúng statusCode + code, không kèm errors", () => {
    const { req, res, next } = mockReqRes();
    errorHandler(new AppError("Không có quyền", 403, "FORBIDDEN"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Không có quyền",
      code: "FORBIDDEN",
    });
  });

  it("lỗi lạ → 500 với message chung, KHÔNG lộ stack trace hay chi tiết nội bộ ra client", () => {
    const { req, res, next } = mockReqRes();
    spyOnLoggerError(); // chỉ để log không in ra terminal lúc chạy test, không assert ở đây
    errorHandler(
      new TypeError("Cannot read property 'x' of undefined at /src/secret.ts:42"),
      req,
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0]![0] as Record<string, unknown>;
    expect(body).toEqual({
      success: false,
      message: "Đã có lỗi xảy ra, vui lòng thử lại",
      code: "INTERNAL_ERROR",
    });
    expect(JSON.stringify(body)).not.toContain("secret.ts");
  });

  it("vẫn log đầy đủ lỗi lạ ở phía server để điều tra", () => {
    const { req, res, next } = mockReqRes();
    const errorSpy = spyOnLoggerError();
    errorHandler(new Error("bug thật"), req, res, next);
    expect(logger.withRequestId).toHaveBeenCalledWith("req-1"); // có requestId để trace
    expect(errorSpy).toHaveBeenCalled();
  });

  describe("lỗi Prisma đã biết (docs/12 BE-07)", () => {
    function prismaError(code: string) {
      return new Prisma.PrismaClientKnownRequestError("lỗi Prisma", {
        code,
        clientVersion: "5.0.0",
      });
    }

    it("P2002 (vi phạm unique) → 409 DUPLICATE, không phải 500", () => {
      const { req, res, next } = mockReqRes();
      errorHandler(prismaError("P2002"), req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Dữ liệu đã tồn tại",
        code: "DUPLICATE",
      });
    });

    it("P2025 (không tìm thấy bản ghi) → 404 NOT_FOUND", () => {
      const { req, res, next } = mockReqRes();
      errorHandler(prismaError("P2025"), req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Không tìm thấy dữ liệu",
        code: "NOT_FOUND",
      });
    });

    it("P2003 (vi phạm khoá ngoại) → 409 FOREIGN_KEY_CONSTRAINT", () => {
      const { req, res, next } = mockReqRes();
      errorHandler(prismaError("P2003"), req, res, next);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Dữ liệu đang được tham chiếu ở nơi khác",
        code: "FOREIGN_KEY_CONSTRAINT",
      });
    });

    it("mã Prisma KHÔNG nằm trong danh sách đã biết vẫn rơi vào nhánh lỗi lạ → 500, có log", () => {
      const { req, res, next } = mockReqRes();
      const errorSpy = spyOnLoggerError();
      errorHandler(prismaError("P9999"), req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Đã có lỗi xảy ra, vui lòng thử lại",
        code: "INTERNAL_ERROR",
      });
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});

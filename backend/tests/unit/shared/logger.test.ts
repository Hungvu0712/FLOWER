import { beforeEach, describe, expect, it, vi } from "vitest";

// docs/12 BE-18: đổi logger tự viết sang pino — mock pino thay vì log thật ra stdout trong test.
// Interface `logger.*`/`logger.withRequestId(id).*` phải giữ NGUYÊN so với logger cũ, nên test tập
// trung xác nhận: (1) interface không đổi, (2) dữ liệu được gói đúng thành field có cấu trúc thay vì
// nối chuỗi thô, (3) requestId gắn vào qua pino `child()`.
function makeFakeLogger() {
  return { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), child: vi.fn() };
}

const rootLogger = makeFakeLogger();
const childLogger = makeFakeLogger();
rootLogger.child.mockReturnValue(childLogger);
vi.mock("pino", () => ({ default: () => rootLogger }));

const envMock = { isProd: false };
vi.mock("@/config/env", () => ({ env: envMock }));

const { logger } = await import("@/shared/logger/logger");

describe("logger (docs/12 BE-18 — đổi sang pino, giữ nguyên interface)", () => {
  beforeEach(() => {
    Object.values(rootLogger).forEach((fn) => "mockClear" in fn && fn.mockClear());
    Object.values(childLogger).forEach((fn) => "mockClear" in fn && fn.mockClear());
    rootLogger.child.mockReturnValue(childLogger);
  });

  it("giữ nguyên interface: error/warn/info/debug + withRequestId(id).*", () => {
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.withRequestId).toBe("function");
    const child = logger.withRequestId("req-1");
    expect(typeof child.error).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.info).toBe("function");
    expect(typeof child.debug).toBe("function");
  });

  it("chỉ có message (không extra) → gọi pino với field rỗng + đúng message", () => {
    logger.info("Chỉ có message");
    expect(rootLogger.info).toHaveBeenCalledWith({}, "Chỉ có message");
  });

  it("có 1 giá trị extra → gói vào field 'detail' có cấu trúc, không nối chuỗi thô", () => {
    logger.error("Backup thất bại", "Connection timeout");
    expect(rootLogger.error).toHaveBeenCalledWith(
      { detail: "Connection timeout" },
      "Backup thất bại",
    );
  });

  it("có nhiều giá trị extra → gói cả mảng vào 'detail'", () => {
    logger.warn("Nhiều chi tiết", "a", "b", 3);
    expect(rootLogger.warn).toHaveBeenCalledWith({ detail: ["a", "b", 3] }, "Nhiều chi tiết");
  });

  it("withRequestId(id) tạo pino child logger với requestId, không tự nối vào message", () => {
    logger.withRequestId("req-abc").error("Lỗi trong request");
    expect(rootLogger.child).toHaveBeenCalledWith({ requestId: "req-abc" });
    expect(childLogger.error).toHaveBeenCalledWith({}, "Lỗi trong request");
  });

  it("message không phải string (vd lỗi gọi nhầm) vẫn không throw — ép về string an toàn", () => {
    expect(() => logger.error(new Error("boom") as never)).not.toThrow();
  });
});

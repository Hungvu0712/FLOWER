import pino from "pino";
import { env } from "../../config/env";

type Level = "error" | "warn" | "info" | "debug";

// docs/12 BE-18: trước đây tự viết logger in ra text thô qua console.* — không xuất JSON có cấu
// trúc, khó lọc/tra cứu khi có hệ thống log tập trung (Datadog/CloudWatch/ELK...) ở production. Đổi
// sang `pino` nhưng GIỮ NGUYÊN interface `logger.*`/`logger.withRequestId(id).*` — nơi gọi (8 file)
// không phải sửa gì. Production in JSON thô (đúng mục đích); dev/test dùng `pino-pretty` để vẫn đọc
// được trên terminal như log cũ.
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  ...(!env.isProd && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
    },
  }),
});

// Production không log password/token/cookie/secret — chỉ log message + context caller truyền vào,
// không bao giờ log toàn bộ req.body/req.headers ở đây. Xem docs/07.
function toFields(extra: unknown[]): Record<string, unknown> {
  if (extra.length === 0) return {};
  return { detail: extra.length === 1 ? extra[0] : extra };
}

// Nơi gọi cũ truyền (message, ...extra) kiểu console.log — gói extra vào 1 field có cấu trúc thay vì
// nối chuỗi, để log JSON ở production lọc/query được theo field thay vì phải parse text.
function log(base: pino.Logger, level: Level, args: unknown[]): void {
  const [msg, ...extra] = args;
  const message = typeof msg === "string" ? msg : String(msg);
  base[level](toFields(extra), message);
}

function buildLevelMethods(base: pino.Logger) {
  return {
    error: (...args: unknown[]) => log(base, "error", args),
    warn: (...args: unknown[]) => log(base, "warn", args),
    info: (...args: unknown[]) => log(base, "info", args),
    debug: (...args: unknown[]) => log(base, "debug", args),
  };
}

export const logger = {
  ...buildLevelMethods(pinoLogger),
  // withRequestId(reqId).error(...) — gắn request ID vào mọi dòng log trong 1 request để trace xuyên
  // module. pino `child()` tự động gộp `requestId` vào MỌI dòng log gọi qua logger con này.
  withRequestId: (requestId: string) => buildLevelMethods(pinoLogger.child({ requestId })),
};

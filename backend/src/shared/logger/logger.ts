type Level = "error" | "warn" | "info" | "debug";

const levels: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel =
  levels[(process.env.LOG_LEVEL as Level) || "info"] ?? levels.info;

// Production không log password/token/cookie/secret — chỉ log message + context caller truyền vào,
// không bao giờ log toàn bộ req.body/req.headers ở đây. Xem docs/07.
function log(
  level: Level,
  requestId: string | undefined,
  ...args: unknown[]
): void {
  if (levels[level] > currentLevel) return;
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ""}`;
  console[level === "debug" ? "log" : level](prefix, ...args);
}

export const logger = {
  error: (...args: unknown[]) => log("error", undefined, ...args),
  warn: (...args: unknown[]) => log("warn", undefined, ...args),
  info: (...args: unknown[]) => log("info", undefined, ...args),
  debug: (...args: unknown[]) => log("debug", undefined, ...args),
  // withRequestId(reqId).error(...) — gắn request ID vào mọi dòng log trong 1 request để trace xuyên module.
  withRequestId: (requestId: string) => ({
    error: (...args: unknown[]) => log("error", requestId, ...args),
    warn: (...args: unknown[]) => log("warn", requestId, ...args),
    info: (...args: unknown[]) => log("info", requestId, ...args),
    debug: (...args: unknown[]) => log("debug", requestId, ...args),
  }),
};

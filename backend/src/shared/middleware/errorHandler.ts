import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ValidationError } from "../errors";
import { logger } from "../logger/logger";

// Các mã lỗi Prisma đã biết trước, có nghĩa nghiệp vụ rõ ràng — khác với lỗi lạ thật sự (bug).
// Xem docs/12 BE-07. Danh sách đầy đủ: https://www.prisma.io/docs/orm/reference/error-reference
const KNOWN_PRISMA_ERRORS: Record<string, [number, string, string]> = {
  P2002: [409, "DUPLICATE", "Dữ liệu đã tồn tại"],
  P2025: [404, "NOT_FOUND", "Không tìm thấy dữ liệu"],
  P2003: [409, "FOREIGN_KEY_CONSTRAINT", "Dữ liệu đang được tham chiếu ở nơi khác"],
};

// Đăng ký CUỐI CÙNG trong app.ts — mọi next(err) trong app đều rơi vào đây.
// Format thống nhất toàn API:
//   lỗi thường:    { success: false, message, code }
//   lỗi validate:  { success: false, message: "Validation failed", errors: { field: message } }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  const log = logger.withRequestId(req.requestId);

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, code: err.code });
    return;
  }

  // Trước đây (docs/12 BE-07) mọi lỗi Prisma đều rơi vào nhánh "lỗi lạ" bên dưới → 500 dù nguyên
  // nhân là dữ liệu trùng khoá unique hay không tìm thấy bản ghi — client không phân biệt được với
  // bug thật sự. Map các mã đã biết sang status/code có nghĩa TRƯỚC khi coi là lỗi lạ.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = KNOWN_PRISMA_ERRORS[err.code];
    if (mapped) {
      const [status, code, message] = mapped;
      res.status(status).json({ success: false, message, code });
      return;
    }
  }

  // Lỗi lạ (bug thật sự, không phải lỗi nghiệp vụ đã lường trước) — log đầy đủ để điều tra,
  // KHÔNG bao giờ trả stack trace hay chi tiết nội bộ cho client (kể cả dev lẫn production).
  log.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Đã có lỗi xảy ra, vui lòng thử lại",
    code: "INTERNAL_ERROR",
  });
}

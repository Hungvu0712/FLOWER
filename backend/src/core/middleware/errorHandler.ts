import type { NextFunction, Request, Response } from 'express';
import { AppError, ValidationError } from '../errors';
import { logger } from '../logger/logger';

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

  // Lỗi lạ (bug thật sự, không phải lỗi nghiệp vụ đã lường trước) — log đầy đủ để điều tra,
  // KHÔNG bao giờ trả stack trace hay chi tiết nội bộ cho client (kể cả dev lẫn production).
  log.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Đã có lỗi xảy ra, vui lòng thử lại', code: 'INTERNAL_ERROR' });
}

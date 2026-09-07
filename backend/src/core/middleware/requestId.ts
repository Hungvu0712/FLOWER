import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Gắn 1 request ID duy nhất cho mỗi request — trả về qua header X-Request-Id để client đối chiếu khi
// báo lỗi, và log kèm ID này để trace xuyên middleware/controller/service. Tôn trọng ID client tự gửi
// lên (vd hệ thống frontend/proxy khác đã gán từ trước) nếu có.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  req.requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

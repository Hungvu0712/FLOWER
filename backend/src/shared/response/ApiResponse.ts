import type { Response } from "express";

// Response envelope thống nhất toàn API — mọi controller dùng qua đây thay vì tự gọi res.json({...}).
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, message = "Success", statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function created<T>(res: Response, data: T, message = "Created"): Response {
  return ok(res, data, message, 201);
}

export function paginated<T>(
  res: Response,
  items: T[],
  meta: PaginationMeta,
  message = "Success",
): Response {
  return res.status(200).json({ success: true, message, data: items, meta });
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Bọc mọi controller async — mọi Promise reject tự động next(err) thay vì crash tiến trình
// hoặc treo request (không cần try/catch lặp lại trong từng controller).
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

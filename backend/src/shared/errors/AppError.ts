export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational = true; // lỗi nghiệp vụ đã lường trước, khác lỗi hệ thống (bug)

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace?.(this, AppError);
  }
}

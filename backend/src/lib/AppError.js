class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // lỗi nghiệp vụ đã lường trước, khác lỗi hệ thống
  }
}

module.exports = AppError;

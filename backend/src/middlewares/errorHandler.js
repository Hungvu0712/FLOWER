const logger = require('../lib/logger');

// Đăng ký CUỐI CÙNG trong app.js — mọi next(err) trong app đều rơi vào đây.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (!err.isOperational) {
    // Lỗi lạ (bug thật sự, không phải lỗi nghiệp vụ đã lường trước) — log đầy đủ stack để điều tra.
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại',
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = errorHandler;

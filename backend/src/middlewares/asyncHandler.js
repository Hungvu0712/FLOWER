// Bọc mọi controller async — mọi Promise reject tự động next(err) thay vì crash tiến trình.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

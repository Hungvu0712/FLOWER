const AppError = require('../lib/AppError');

// validate({ body: zodSchema, query: zodSchema, params: zodSchema })
// Parse + gán ngược giá trị đã coerce (vd query string "1" -> number 1) vào req, để controller dùng luôn.
function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      const message = err.errors?.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ') || 'Dữ liệu không hợp lệ';
      next(new AppError(message, 422, 'VALIDATION_ERROR'));
    }
  };
}

module.exports = validate;

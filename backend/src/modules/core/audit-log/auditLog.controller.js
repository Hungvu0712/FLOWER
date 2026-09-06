const asyncHandler = require('../../../middlewares/asyncHandler');
const auditLogService = require('./auditLog.service');

const list = asyncHandler(async (req, res) => {
  const result = await auditLogService.list(req.query);
  res.json({ success: true, data: result });
});

module.exports = { list };

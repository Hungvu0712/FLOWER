const asyncHandler = require('../../../middlewares/asyncHandler');
const service = require('./loginMethods.service');

const list = asyncHandler(async (req, res) => {
  const methods = await service.list();
  res.json({ success: true, data: methods });
});

const update = asyncHandler(async (req, res) => {
  const method = await service.update(req.user.id, req.params.method, req.body.isEnabled, req.ip);
  res.json({ success: true, data: method });
});

module.exports = { list, update };

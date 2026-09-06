const asyncHandler = require('../../../middlewares/asyncHandler');
const service = require('./permissions.service');

const list = asyncHandler(async (req, res) => {
  const permissions = await service.list(req.query);
  res.json({ success: true, data: permissions });
});

const create = asyncHandler(async (req, res) => {
  const permission = await service.create(req.user.id, req.body, req.ip);
  res.status(201).json({ success: true, data: permission });
});

const update = asyncHandler(async (req, res) => {
  const permission = await service.update(req.user.id, req.params.id, req.body, req.ip);
  res.json({ success: true, data: permission });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.id, req.params.id, req.ip);
  res.json({ success: true, message: 'Đã xoá permission' });
});

module.exports = { list, create, update, remove };

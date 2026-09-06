const asyncHandler = require('../../../middlewares/asyncHandler');
const service = require('./roles.service');

const list = asyncHandler(async (req, res) => {
  const roles = await service.list();
  res.json({ success: true, data: roles });
});

const create = asyncHandler(async (req, res) => {
  const role = await service.create(req.user.id, req.body, req.ip);
  res.status(201).json({ success: true, data: role });
});

const update = asyncHandler(async (req, res) => {
  const role = await service.update(req.user.id, req.params.id, req.body, req.ip);
  res.json({ success: true, data: role });
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.user.id, req.params.id, req.ip);
  res.json({ success: true, message: 'Đã xoá role' });
});

module.exports = { list, create, update, remove };

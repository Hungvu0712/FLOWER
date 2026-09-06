const asyncHandler = require('../../../middlewares/asyncHandler');
const filesService = require('./files.service');

const presign = asyncHandler(async (req, res) => {
  const result = await filesService.getPresignedUploadUrl(req.body, req.user.id);
  res.json({ success: true, data: result });
});

const create = asyncHandler(async (req, res) => {
  const file = await filesService.createFileRecord(req.body, req.user.id);
  res.status(201).json({ success: true, data: file });
});

const list = asyncHandler(async (req, res) => {
  const result = await filesService.listFiles(req.query);
  res.json({ success: true, data: result });
});

const remove = asyncHandler(async (req, res) => {
  await filesService.softDeleteFile(req.params.id);
  res.json({ success: true, message: 'Đã xoá file' });
});

module.exports = { presign, create, list, remove };

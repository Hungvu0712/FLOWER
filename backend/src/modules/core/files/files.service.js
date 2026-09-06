const crypto = require('crypto');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const prisma = require('../../../config/prisma');
const r2Client = require('../../../config/r2');
const env = require('../../../config/env');
const AppError = require('../../../lib/AppError');

function buildPublicUrl(r2Key) {
  return `${env.r2.publicUrl.replace(/\/$/, '')}/${r2Key}`;
}

// Backend chỉ cấp URL tạm — file đi thẳng từ trình duyệt lên R2, không qua server Express.
// Xem ARCHITECTURE.md §5.
async function getPresignedUploadUrl({ originalName, mimeType, sizeBytes, folderId }, userId) {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
  const r2Key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;

  const command = new PutObjectCommand({
    Bucket: env.r2.bucket,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 5 * 60 }); // 5 phút

  return { uploadUrl, r2Key, publicUrl: buildPublicUrl(r2Key), folderId: folderId || null };
}

// Frontend gọi sau khi upload trực tiếp lên R2 thành công, để lưu metadata vào DB.
async function createFileRecord({ r2Key, originalName, mimeType, sizeBytes, folderId }, userId) {
  return prisma.file.create({
    data: {
      r2Key,
      url: buildPublicUrl(r2Key),
      originalName,
      mimeType,
      sizeBytes,
      folderId: folderId || null,
      uploadedBy: userId,
    },
  });
}

async function listFiles({ folderId, page, pageSize }) {
  const where = { deletedAt: null, ...(folderId !== undefined && { folderId: folderId || null }) };
  const [items, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.file.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

// Đánh dấu tái sử dụng: gán 1 file cho 1 entity (vd avatar của user, ảnh đại diện sản phẩm).
// Gỡ usage cũ của entity đó trước (nếu có) — ảnh cũ không bị xoá ngay, chỉ hết được đánh dấu là đang dùng,
// job dọn mồ côi sẽ xử lý theo lịch nếu không còn nơi nào khác tham chiếu tới.
async function setEntityFile({ fileId, entityType, entityId }) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt) throw new AppError('File không tồn tại', 404, 'FILE_NOT_FOUND');

  await prisma.fileUsage.deleteMany({ where: { entityType, entityId } });
  await prisma.fileUsage.create({ data: { fileId, entityType, entityId } });
}

async function addFileUsage({ fileId, entityType, entityId }) {
  await prisma.fileUsage.upsert({
    where: { fileId_entityType_entityId: { fileId, entityType, entityId } },
    create: { fileId, entityType, entityId },
    update: {},
  });
}

// Xoá thủ công từ màn quản lý tài nguyên — soft delete ngay, R2 object bị purge thật sự ở lượt quét
// file mồ côi định kỳ (10 ngày/lần) để có khoảng đệm an toàn, tránh xoá nhầm.
async function softDeleteFile(id) {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new AppError('File không tồn tại', 404, 'FILE_NOT_FOUND');
  await prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
}

async function purgeFileFromR2(r2Key) {
  await r2Client.send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: r2Key }));
}

module.exports = {
  getPresignedUploadUrl,
  createFileRecord,
  listFiles,
  setEntityFile,
  addFileUsage,
  softDeleteFile,
  purgeFileFromR2,
};

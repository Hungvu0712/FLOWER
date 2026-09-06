const prisma = require('../config/prisma');
const filesService = require('../modules/core/files/files.service');
const logger = require('../lib/logger');

const SAFETY_WINDOW_HOURS = 24; // không đụng vào file vừa upload nhưng form chưa submit xong

// Chạy 10 ngày/lần (xem jobs/index.js) — xem DATABASE.md §3.3, ARCHITECTURE.md §5.
async function cleanupOrphanFiles() {
  const cutoff = new Date(Date.now() - SAFETY_WINDOW_HOURS * 60 * 60 * 1000);

  const candidates = await prisma.file.findMany({
    where: {
      OR: [
        { deletedAt: { not: null } }, // đã bị xoá thủ công qua màn quản lý tài nguyên
        { deletedAt: null, createdAt: { lt: cutoff }, usages: { none: {} } }, // mồ côi thật sự
      ],
    },
  });

  let purged = 0;
  for (const file of candidates) {
    try {
      await filesService.purgeFileFromR2(file.r2Key);
      await prisma.file.delete({ where: { id: file.id } });
      purged += 1;
    } catch (err) {
      logger.error(`Xoá file mồ côi thất bại (id=${file.id}, r2Key=${file.r2Key}):`, err.message);
    }
  }

  logger.info(`[cleanupOrphanFiles] Quét ${candidates.length} file, xoá thành công ${purged}.`);
}

module.exports = cleanupOrphanFiles;

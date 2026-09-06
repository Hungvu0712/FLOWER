const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const r2Client = require('../config/r2');
const env = require('../config/env');
const logger = require('../lib/logger');

const BACKUP_PREFIX = 'backups/';
const RETENTION_DAYS = 30;

// Yêu cầu binary `pg_dump` có sẵn trong môi trường chạy (VPS/Docker image production) — xem
// ARCHITECTURE.md §4. Chạy 2 ngày/lần (jobs/index.js).
function dumpToFile(filePath) {
  return new Promise((resolve, reject) => {
    const dump = spawn('pg_dump', [env.databaseUrl, '--format=custom', '--file', filePath]);
    dump.on('error', reject); // vd không tìm thấy binary pg_dump
    dump.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump exited with code ${code}`))));
  });
}

async function backupDatabase() {
  const fileName = `db-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`;
  const tmpPath = path.join(os.tmpdir(), fileName);

  try {
    await dumpToFile(tmpPath);
    const body = fs.readFileSync(tmpPath);

    await r2Client.send(new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: `${BACKUP_PREFIX}${fileName}`,
      Body: body,
    }));

    logger.info(`[backupDatabase] Backup thành công: ${fileName}`);
  } catch (err) {
    logger.error('[backupDatabase] Backup thất bại:', err.message);
  } finally {
    fs.existsSync(tmpPath) && fs.unlinkSync(tmpPath);
  }
}

// Tự động xoá backup cũ hơn 1 tháng — xem SECURITY.md §5.
async function cleanupOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const list = await r2Client.send(new ListObjectsV2Command({ Bucket: env.r2.bucket, Prefix: BACKUP_PREFIX }));

  const expired = (list.Contents || []).filter((obj) => obj.LastModified && obj.LastModified.getTime() < cutoff);
  for (const obj of expired) {
    await r2Client.send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: obj.Key }));
  }

  logger.info(`[cleanupOldBackups] Đã xoá ${expired.length} backup quá ${RETENTION_DAYS} ngày.`);
}

module.exports = { backupDatabase, cleanupOldBackups };

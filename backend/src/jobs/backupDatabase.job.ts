import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { r2Client } from "../config/r2";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

const BACKUP_PREFIX = "backups/";
const RETENTION_DAYS = 30;

// Yêu cầu binary `pg_dump` có sẵn trong môi trường chạy (VPS/Docker image production) — xem
// docs/02 §5. Chạy 2 ngày/lần (jobs/index.ts).
function dumpToFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dump = spawn("pg_dump", [
      env.databaseUrl,
      "--format=custom",
      "--file",
      filePath,
    ]);
    dump.on("error", reject); // vd không tìm thấy binary pg_dump
    dump.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`pg_dump exited with code ${code}`)),
    );
  });
}

export async function backupDatabase(): Promise<void> {
  const fileName = `db-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const tmpPath = path.join(os.tmpdir(), fileName);

  try {
    await dumpToFile(tmpPath);
    const body = fs.readFileSync(tmpPath);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: `${BACKUP_PREFIX}${fileName}`,
        Body: body,
      }),
    );

    logger.info(`[backupDatabase] Backup thành công: ${fileName}`);
  } catch (err) {
    logger.error(
      "[backupDatabase] Backup thất bại:",
      err instanceof Error ? err.message : err,
    );
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

// Tự động xoá backup cũ hơn 30 ngày — xem docs/07 §5.
export async function cleanupOldBackups(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const list = await r2Client.send(
    new ListObjectsV2Command({ Bucket: env.r2.bucket, Prefix: BACKUP_PREFIX }),
  );

  const expired = (list.Contents || []).filter(
    (obj) => obj.LastModified && obj.LastModified.getTime() < cutoff,
  );
  for (const obj of expired) {
    if (obj.Key)
      await r2Client.send(
        new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: obj.Key }),
      );
  }

  logger.info(
    `[cleanupOldBackups] Đã xoá ${expired.length} backup quá ${RETENTION_DAYS} ngày.`,
  );
}

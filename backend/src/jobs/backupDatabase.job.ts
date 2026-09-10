import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { cloudinary } from "../config/cloudinary";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";

const BACKUP_PREFIX = "backups/";
const RETENTION_DAYS = 30;
// File .dump không phải ảnh/video — resourceType "raw" (khác "image" của module Files, xem
// files.service.ts) là loại duy nhất Cloudinary chấp nhận cho file nhị phân tuỳ ý.
const RESOURCE_TYPE = "raw";

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

    // use_filename/unique_filename: false — publicId phải giữ ĐÚNG tên đã đặt (đã có timestamp riêng
    // biệt), để cleanupOldBackups tra lại bằng prefix mà không bị Cloudinary tự thêm hậu tố ngẫu nhiên.
    await cloudinary.uploader.upload(tmpPath, {
      resource_type: RESOURCE_TYPE,
      public_id: `${BACKUP_PREFIX}${fileName}`,
      use_filename: false,
      unique_filename: false,
    });

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
  const list = await cloudinary.api.resources({
    resource_type: RESOURCE_TYPE,
    type: "upload",
    prefix: BACKUP_PREFIX,
    max_results: 500, // giới hạn 1 lần gọi của Cloudinary — đủ dùng vì job chạy 2 ngày/lần, giữ 30
    // ngày thì tối đa ~15 backup tồn tại cùng lúc, không cần phân trang qua next_cursor.
  });

  const expired = (list.resources as Array<{ public_id: string; created_at: string }>).filter(
    (resource) => new Date(resource.created_at).getTime() < cutoff,
  );
  for (const resource of expired) {
    await cloudinary.uploader.destroy(resource.public_id, {
      resource_type: RESOURCE_TYPE,
    });
  }

  logger.info(
    `[cleanupOldBackups] Đã xoá ${expired.length} backup quá ${RETENTION_DAYS} ngày.`,
  );
}

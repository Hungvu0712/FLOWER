import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { cloudinary } from "../config/cloudinary";
import { env } from "../config/env";
import { logger } from "../shared/logger/logger";
import { encryptBackupBuffer } from "../shared/utils/backupEncryption";

const BACKUP_PREFIX = "backups/";
const RETENTION_DAYS = 30;
// File .dump không phải ảnh/video — resourceType "raw" (khác "image" của module Files, xem
// files.service.ts) là loại duy nhất Cloudinary chấp nhận cho file nhị phân tuỳ ý.
const RESOURCE_TYPE = "raw";

// Yêu cầu binary `pg_dump` có sẵn trong môi trường chạy (VPS/Docker image production) — xem
// docs/02 §5. Chạy 2 ngày/lần (jobs/index.ts). `--compress=9` (docs/12 OPS-02): định dạng "custom"
// vốn đã nén sẵn mặc định, nhưng mức nén mặc định phụ thuộc bản pg_dump — ép rõ mức tối đa để không
// phụ thuộc cấu hình môi trường.
function dumpToFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dump = spawn("pg_dump", [
      env.databaseUrl,
      "--format=custom",
      "--compress=9",
      "--file",
      filePath,
    ]);
    dump.on("error", reject); // vd không tìm thấy binary pg_dump
    dump.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`pg_dump exited with code ${code}`)),
    );
  });
}

export async function backupDatabase(): Promise<void> {
  const fileName = `db-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  const tmpPath = path.join(os.tmpdir(), fileName);
  let encryptedTmpPath: string | undefined;

  try {
    await dumpToFile(tmpPath);

    // docs/12 OPS-02: chỉ mã hoá khi đã cấu hình khoá công khai — thiếu khoá thì vẫn backup được
    // (không chặn tính năng chính vì thiếu 1 biến môi trường tuỳ chọn), nhưng CẢNH BÁO rõ ràng vì
    // backup thô chứa dữ liệu khách hàng (tên, SĐT, địa chỉ giao hàng).
    let uploadPath = tmpPath;
    let uploadFileName = fileName;
    if (env.backupEncryptionPublicKeyPem) {
      const encrypted = encryptBackupBuffer(
        fs.readFileSync(tmpPath),
        env.backupEncryptionPublicKeyPem,
      );
      uploadFileName = `${fileName}.enc`;
      encryptedTmpPath = path.join(os.tmpdir(), uploadFileName);
      fs.writeFileSync(encryptedTmpPath, encrypted);
      uploadPath = encryptedTmpPath;
    } else {
      logger.warn(
        "[backupDatabase] BACKUP_ENCRYPTION_PUBLIC_KEY chưa cấu hình — backup KHÔNG được mã hoá trước khi upload.",
      );
    }

    // use_filename/unique_filename: false — publicId phải giữ ĐÚNG tên đã đặt (đã có timestamp riêng
    // biệt), để cleanupOldBackups tra lại bằng prefix mà không bị Cloudinary tự thêm hậu tố ngẫu nhiên.
    await cloudinary.uploader.upload(uploadPath, {
      resource_type: RESOURCE_TYPE,
      public_id: `${BACKUP_PREFIX}${uploadFileName}`,
      use_filename: false,
      unique_filename: false,
    });

    logger.info(`[backupDatabase] Backup thành công: ${uploadFileName}`);
  } catch (err) {
    logger.error("[backupDatabase] Backup thất bại:", err instanceof Error ? err.message : err);
  } finally {
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    if (encryptedTmpPath && fs.existsSync(encryptedTmpPath)) fs.unlinkSync(encryptedTmpPath);
  }
}

// Tự động xoá backup cũ hơn 30 ngày — xem docs/07 §5.
// docs/12 OPS-03: 1 lần gọi `cloudinary.api.resources` trả tối đa 500 object (tham số `max_results`),
// KHÔNG tự động lấy hết nếu có nhiều hơn — trước đây không lặp qua `next_cursor` nên object thứ 501
// trở đi bị bỏ sót vĩnh viễn (không lỗi, chỉ âm thầm không được xét tới). Lịch hiện tại (2 ngày/lần,
// giữ 30 ngày ≈ 15 backup) chưa chạm giới hạn, nhưng đây là quả bom hẹn giờ nếu tăng tần suất backup
// hoặc dùng chung bucket/prefix với dữ liệu khác — nay lặp qua hết mọi trang trước khi lọc.
async function listAllBackupResources(): Promise<Array<{ public_id: string; created_at: string }>> {
  const resources: Array<{ public_id: string; created_at: string }> = [];
  let nextCursor: string | undefined;

  do {
    const page = await cloudinary.api.resources({
      resource_type: RESOURCE_TYPE,
      type: "upload",
      prefix: BACKUP_PREFIX,
      max_results: 500, // giới hạn tối đa 1 lần gọi của Cloudinary
      next_cursor: nextCursor,
    });
    resources.push(...(page.resources as Array<{ public_id: string; created_at: string }>));
    nextCursor = page.next_cursor as string | undefined;
  } while (nextCursor);

  return resources;
}

export async function cleanupOldBackups(): Promise<void> {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const allResources = await listAllBackupResources();

  const expired = allResources.filter(
    (resource) => new Date(resource.created_at).getTime() < cutoff,
  );
  for (const resource of expired) {
    await cloudinary.uploader.destroy(resource.public_id, {
      resource_type: RESOURCE_TYPE,
    });
  }

  logger.info(`[cleanupOldBackups] Đã xoá ${expired.length} backup quá ${RETENTION_DAYS} ngày.`);
}

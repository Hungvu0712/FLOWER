-- Đổi tên cột r2_key -> cloudinary_public_id khi chuyển lưu trữ file từ Cloudflare R2 sang Cloudinary.
-- Dùng RENAME COLUMN (không phải DROP + ADD) để giữ nguyên dữ liệu hiện có — file cũ tạo lúc còn dùng
-- R2 vẫn còn `url` trỏ đúng chỗ (cột url không đổi), chỉ giá trị cloudinary_public_id của các file CŨ
-- đó thực chất vẫn là r2Key cũ (không phải public_id thật trên Cloudinary) — job dọn file mồ côi gọi
-- purgeFileFromCloudinary() với giá trị này sẽ lỗi "not found" và bị bắt/log, KHÔNG crash job (xem
-- catch trong cleanupOrphanFiles.job.ts), nhưng cũng không xoá được — coi là nợ dữ liệu đã biết khi
-- chuyển nhà cung cấp, không chặn việc merge.
ALTER TABLE "files" RENAME COLUMN "r2_key" TO "cloudinary_public_id";

-- Postgres không tự đổi tên index/constraint khi RENAME COLUMN — đổi luôn cho khớp tên cột mới.
-- Unique constraint ở đây được cài đặt bằng UNIQUE INDEX (không phải table constraint riêng), nên
-- dùng RENAME INDEX, không phải RENAME CONSTRAINT.
ALTER INDEX "files_r2_key_key" RENAME TO "files_cloudinary_public_id_key";

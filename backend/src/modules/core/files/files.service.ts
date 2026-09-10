import crypto from "crypto";
import { cloudinary } from "../../../config/cloudinary";
import { prisma } from "../../../config/prisma";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import { MAX_SIZE_BYTES } from "./files.validation";
import type {
  PresignInput,
  CreateFileInput,
  ListFilesQuery,
} from "./files.validation";

// Cloudinary xem PDF là "image" (dựng được thumbnail từng trang) nên toàn bộ file của module này
// (ảnh + PDF) dùng resourceType "image" — không cần lưu riêng resourceType cho từng file trong DB.
const CLOUDINARY_RESOURCE_TYPE = "image";
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "gif", "pdf"];
const FORMAT_TO_MIME_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

// Backend chỉ ký tham số — file đi thẳng từ trình duyệt lên Cloudinary, không qua server Express.
// Xem docs/02 §6.
//
// Khác biệt so với R2 (S3 presigned URL): chữ ký của Cloudinary KHÔNG ràng buộc được kích thước file
// (S3 có ContentLength trong chữ ký, Cloudinary không có tham số tương đương để ký). Vì vậy giới hạn
// 10MB không chặn được TRƯỚC khi upload — bù lại bằng cách kiểm chứng kích thước thật sau khi upload
// xong, ở createFileRecord() bên dưới (gọi Admin API lấy metadata thật, xoá luôn nếu vượt hạn mức).
export async function getUploadSignature({ folderId }: PresignInput) {
  const publicId = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const allowedFormats = ALLOWED_FORMATS.join(",");

  const signature = cloudinary.utils.api_sign_request(
    { public_id: publicId, timestamp, allowed_formats: allowedFormats },
    env.cloudinary.apiSecret,
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudinary.cloudName}/${CLOUDINARY_RESOURCE_TYPE}/upload`,
    publicId,
    timestamp,
    signature,
    apiKey: env.cloudinary.apiKey,
    allowedFormats,
    folderId: folderId ?? null,
  };
}

// Frontend gọi sau khi upload trực tiếp lên Cloudinary thành công, để lưu metadata vào DB.
// KHÔNG tin originalName/mimeType/sizeBytes do client gửi — publicId chứng minh file thật đã tồn tại
// trên Cloudinary (gọi Admin API tra lại), và metadata lưu vào DB là metadata THẬT Cloudinary trả về,
// không phải giá trị client tự khai (đóng lỗ hổng BE-10 từng ghi ở docs/modules/core-files.md khi còn
// dùng R2 — R2Key bất kỳ không kiểm chứng được, Cloudinary publicId thì tra ngược được).
export async function createFileRecord(input: CreateFileInput, userId: string) {
  const resource = await cloudinary.api
    .resource(input.publicId, { resource_type: CLOUDINARY_RESOURCE_TYPE })
    .catch(() => null);
  if (!resource) {
    throw new AppError(
      "Không tìm thấy file đã upload trên Cloudinary",
      404,
      "FILE_NOT_FOUND",
    );
  }

  if (resource.bytes > MAX_SIZE_BYTES) {
    // Chữ ký không chặn được kích thước lúc upload (xem comment ở getUploadSignature) — phát hiện
    // vượt hạn mức ở đây thì xoá luôn trên Cloudinary, không tạo bản ghi DB.
    await purgeFileFromCloudinary(input.publicId).catch(() => {});
    throw new AppError("File tối đa 10MB", 422, "FILE_TOO_LARGE");
  }

  return prisma.file.create({
    data: {
      cloudinaryPublicId: input.publicId,
      url: resource.secure_url,
      originalName: input.originalName,
      mimeType: FORMAT_TO_MIME_TYPE[resource.format] ?? "application/octet-stream",
      sizeBytes: resource.bytes,
      folderId: input.folderId ?? null,
      uploadedBy: userId,
    },
  });
}

export async function listFiles({ folderId, page, limit }: ListFilesQuery) {
  const where = {
    deletedAt: null,
    ...(folderId !== undefined && { folderId: folderId || null }),
  };
  const [items, total] = await Promise.all([
    prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.file.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(page, limit, total) };
}

interface EntityFileInput {
  fileId: string;
  entityType: string;
  entityId: string;
}

// Đánh dấu tái sử dụng: gán 1 file cho 1 entity (vd avatar của user, ảnh đại diện sản phẩm).
// Gỡ usage cũ của entity đó trước (nếu có) — ảnh cũ không bị xoá ngay, chỉ hết được đánh dấu là đang
// dùng, job dọn mồ côi sẽ xử lý sau, không cần xoá thủ công ở đây.
export async function setEntityFile({
  fileId,
  entityType,
  entityId,
}: EntityFileInput): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt)
    throw new AppError("File không tồn tại", 404, "FILE_NOT_FOUND");

  await prisma.fileUsage.deleteMany({ where: { entityType, entityId } });
  await prisma.fileUsage.create({ data: { fileId, entityType, entityId } });
}

export async function addFileUsage({
  fileId,
  entityType,
  entityId,
}: EntityFileInput): Promise<void> {
  await prisma.fileUsage.upsert({
    where: { fileId_entityType_entityId: { fileId, entityType, entityId } },
    create: { fileId, entityType, entityId },
    update: {},
  });
}

// Xoá thủ công từ màn quản lý tài nguyên — soft delete ngay, object trên Cloudinary bị purge thật sự
// ở lượt quét file mồ côi định kỳ (10 ngày/lần) để có khoảng đệm an toàn, tránh xoá nhầm.
export async function softDeleteFile(id: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new AppError("File không tồn tại", 404, "FILE_NOT_FOUND");
  await prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function purgeFileFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: CLOUDINARY_RESOURCE_TYPE,
  });
}

import crypto from "crypto";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../../../config/prisma";
import { r2Client } from "../../../config/r2";
import { env } from "../../../config/env";
import { AppError } from "../../../shared/errors";
import { buildPaginationMeta } from "../../../shared/response/ApiResponse";
import type {
  PresignInput,
  CreateFileInput,
  ListFilesQuery,
} from "./files.validation";

function buildPublicUrl(r2Key: string): string {
  return `${env.r2.publicUrl.replace(/\/$/, "")}/${r2Key}`;
}

// Backend chỉ cấp URL tạm — file đi thẳng từ trình duyệt lên R2, không qua server Express.
// Xem docs/02 §6.
export async function getPresignedUploadUrl({
  originalName,
  mimeType,
  sizeBytes,
  folderId,
}: PresignInput) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  const r2Key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const command = new PutObjectCommand({
    Bucket: env.r2.bucket,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
  });
  const uploadUrl = await getSignedUrl(r2Client, command, {
    expiresIn: 5 * 60,
  }); // 5 phút

  return {
    uploadUrl,
    r2Key,
    publicUrl: buildPublicUrl(r2Key),
    folderId: folderId ?? null,
  };
}

// Frontend gọi sau khi upload trực tiếp lên R2 thành công, để lưu metadata vào DB.
export async function createFileRecord(input: CreateFileInput, userId: string) {
  return prisma.file.create({
    data: {
      r2Key: input.r2Key,
      url: buildPublicUrl(input.r2Key),
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
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

// Xoá thủ công từ màn quản lý tài nguyên — soft delete ngay, R2 object bị purge thật sự ở lượt quét
// file mồ côi định kỳ (10 ngày/lần) để có khoảng đệm an toàn, tránh xoá nhầm.
export async function softDeleteFile(id: string): Promise<void> {
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) throw new AppError("File không tồn tại", 404, "FILE_NOT_FOUND");
  await prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function purgeFileFromR2(r2Key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: r2Key }),
  );
}

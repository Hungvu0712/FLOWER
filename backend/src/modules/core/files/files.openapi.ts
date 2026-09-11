import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { fileSchema } from "../../../openapi/schemas/shared";
import { presignSchema, createFileSchema, listFilesQuerySchema, fileIdParamSchema } from "./files.validation";

const TAGS = ["Files"];

const presignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  publicId: z.string().openapi({ example: "uploads/2026-09-09/<uuid>" }),
  timestamp: z.number().int(),
  signature: z.string().openapi({ example: "<HMAC-SHA1 hex>" }),
  apiKey: z.string(),
  allowedFormats: z.string().openapi({ example: "jpg,jpeg,png,webp,gif,pdf" }),
  folderId: z.string().uuid().nullable(),
});

registerRoute({
  method: "post",
  path: "/api/v1/files/presign",
  tags: TAGS,
  summary: "Lấy chữ ký để upload thẳng lên Cloudinary",
  description:
    "Zod validate mime/size chỉ để phản hồi sớm cho UX, KHÔNG phải ràng buộc mật mã học — chữ ký " +
    "chỉ ràng buộc định dạng (`allowedFormats`), tính bằng HMAC-SHA1, không có hạn dùng.",
  auth: {},
  request: { body: presignSchema },
  response: { schema: presignResponseSchema },
});

registerRoute({
  method: "post",
  path: "/api/v1/files",
  tags: TAGS,
  summary: "Lưu metadata sau khi upload xong",
  description: "Server tự gọi Cloudinary Admin API lấy url/mimeType/sizeBytes THẬT, không tin client khai.",
  auth: {},
  request: { body: createFileSchema },
  response: { status: 201, schema: fileSchema },
  // 404 FILE_NOT_FOUND (publicId không tồn tại trên Cloudinary) ·
  // 422 FILE_TOO_LARGE (>10MB — file bị xoá luôn trên Cloudinary, không tạo bản ghi DB)
  extraStatuses: [404],
});

registerRoute({
  method: "get",
  path: "/api/v1/files",
  tags: TAGS,
  summary: "Danh sách file trong 1 thư mục (phân trang)",
  description: "Bỏ trống `folderId` = chỉ file ở cấp gốc — khớp quy ước của `GET /folders`.",
  auth: { permission: "files.manage" },
  request: { query: listFilesQuerySchema },
  response: { schema: fileSchema, paginated: true },
});

registerRoute({
  method: "delete",
  path: "/api/v1/files/{id}",
  tags: TAGS,
  summary: "Xoá mềm file",
  description: "Cloudinary object bị purge thật ở lượt cron dọn file mồ côi sau (cửa sổ an toàn 24h).",
  auth: { permission: "files.manage" },
  request: { params: fileIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

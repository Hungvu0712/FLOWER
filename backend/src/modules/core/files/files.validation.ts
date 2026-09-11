import { z } from "zod";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
export const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const presignSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: "Loại file không được hỗ trợ" }),
  }),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES, "File tối đa 10MB"),
  folderId: z.string().uuid().nullable().optional(),
});
export type PresignInput = z.infer<typeof presignSchema>;

export const createFileSchema = z.object({
  publicId: z.string().min(1),
  originalName: z.string().min(1),
  folderId: z.string().uuid().nullable().optional(),
});
export type CreateFileInput = z.infer<typeof createFileSchema>;

export const listFilesQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  view: z.enum(["grid", "list"]).default("grid"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListFilesQuery = z.infer<typeof listFilesQuerySchema>;

export const fileIdParamSchema = z.object({ id: z.string().uuid() });

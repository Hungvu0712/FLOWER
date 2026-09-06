const { z } = require('zod');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const presignSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.enum(ALLOWED_MIME_TYPES, { errorMap: () => ({ message: 'Loại file không được hỗ trợ' }) }),
  sizeBytes: z.number().int().positive().max(MAX_SIZE_BYTES, 'File tối đa 10MB'),
  folderId: z.string().uuid().nullable().optional(),
});

const createFileSchema = z.object({
  r2Key: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  folderId: z.string().uuid().nullable().optional(),
});

const listQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  view: z.enum(['grid', 'list']).default('grid'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

const idParamSchema = z.object({ id: z.string().uuid() });

module.exports = { presignSchema, createFileSchema, listQuerySchema, idParamSchema, ALLOWED_MIME_TYPES, MAX_SIZE_BYTES };

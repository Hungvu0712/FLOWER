import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1, "Tên thư mục không được để trống").max(100),
  parentId: z.string().uuid().nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = z.object({
  name: z.string().trim().min(1, "Tên thư mục không được để trống").max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;

// Bỏ trống parentId (không truyền query) = xem thư mục gốc — khớp cách UI cây thư mục mở rộng dần
// từng cấp (lazy-load), không tải hết cây cùng lúc.
export const listFoldersQuerySchema = z.object({
  parentId: z.string().uuid().optional(),
});
export type ListFoldersQuery = z.infer<typeof listFoldersQuerySchema>;

export const folderIdParamSchema = z.object({ id: z.string().uuid() });

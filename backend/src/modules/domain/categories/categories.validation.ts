import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(), // bỏ trống thì tự sinh từ name (xem categories.service.ts)
  description: z.string().optional(),
  imageFileId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryIdParamSchema = z.object({ id: z.string().uuid() });

export const listCategoriesQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

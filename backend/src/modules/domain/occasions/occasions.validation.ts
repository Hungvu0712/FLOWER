import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

export const createOccasionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(), // bỏ trống thì tự sinh từ name (xem occasions.service.ts)
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type CreateOccasionInput = z.infer<typeof createOccasionSchema>;

export const updateOccasionSchema = createOccasionSchema.partial();
export type UpdateOccasionInput = z.infer<typeof updateOccasionSchema>;

export const occasionIdParamSchema = z.object({ id: z.string().uuid() });

export const listOccasionsQuerySchema = z.object({
  includeInactive: zBooleanQuery(),
});
export type ListOccasionsQuery = z.infer<typeof listOccasionsQuerySchema>;

import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

export const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(), // bỏ trống thì tự sinh từ name (xem products.service.ts)
  description: z.string().optional(),
  basePrice: z.number().int().nonnegative(),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  // Toàn bộ bộ ảnh hiện tại của sản phẩm, ĐÚNG THỨ TỰ hiển thị — gửi lại danh sách này ở update là
  // thay thế hoàn toàn bộ ảnh cũ (xem products.service.ts / filesService.syncEntityFiles), không
  // phải "thêm vào".
  imageFileIds: z.array(z.string().uuid()).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productIdParamSchema = z.object({ id: z.string().uuid() });
export const productSlugParamSchema = z.object({ slug: z.string().min(1) });

export const listProductsQuerySchema = z.object({
  includeInactive: zBooleanQuery(),
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

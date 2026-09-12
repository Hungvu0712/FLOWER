import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

// Biến thể giá theo kích cỡ (Nhỏ/Vừa/Lớn...) — KHÔNG có tồn kho riêng, xem schema.prisma
// (ProductVariant). `id` chỉ có khi SỬA 1 biến thể đã tồn tại — bỏ trống `id` = tạo mới. Xem
// products.service.ts#replaceVariants cho ngữ nghĩa "thay thế toàn bộ", giống imageFileIds bên dưới.
const productVariantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Vui lòng nhập tên biến thể").max(50),
  price: z.number().int().nonnegative(),
});

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
  // Toàn bộ bộ biến thể hiện tại — gửi lại danh sách này ở update là THAY THẾ hoàn toàn (bỏ trống
  // field này ở update = không đụng biến thể hiện có; gửi mảng rỗng = xoá hết biến thể). Sản phẩm
  // không bắt buộc phải có biến thể — bỏ trống hoàn toàn thì dùng thẳng basePrice, xem docs/05 §3.4.
  variants: z.array(productVariantSchema).optional(),
  // Toàn bộ danh sách dịp lễ (occasion) đang gắn — cùng ngữ nghĩa THAY THẾ như imageFileIds (không
  // phải "thêm vào"), xem products.service.ts#replaceOccasions.
  occasionIds: z.array(z.string().uuid()).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productIdParamSchema = z.object({ id: z.string().uuid() });
export const productSlugParamSchema = z.object({ slug: z.string().min(1) });

export const listProductsQuerySchema = z.object({
  includeInactive: zBooleanQuery(),
  categoryId: z.string().uuid().optional(),
  occasionId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

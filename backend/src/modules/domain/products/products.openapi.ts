import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { listProductsQuerySchema, productSlugParamSchema } from "./products.validation";

const productImageItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int(),
  file: z.object({ id: z.string().uuid(), url: z.string().url() }),
});

// Mảng RỖNG = sản phẩm không có biến thể, dùng thẳng basePrice. Có biến thể thì basePrice chỉ còn ý
// nghĩa "giá từ..." ở trang danh sách — xem docs/05 §3.4, schema.prisma (ProductVariant).
const productVariantItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: "Lớn" }),
  price: z.number().int().openapi({ example: 450000 }),
});

const productOccasionItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().openapi({ example: "Sinh nhật" }),
  slug: z.string().openapi({ example: "sinh-nhat" }),
});

// Dùng chung với products.admin.openapi.ts — export ở đây vì products.routes.ts (public) là bản
// storefront, products.admin.routes.ts thêm isActive/categoryId/timestamps.
export const publicProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().openapi({
    description: "HTML đã sanitize (rich text) — không phải văn bản thuần.",
  }),
  basePrice: z
    .number()
    .int()
    .openapi({ description: "VND nguyên, không có đơn vị lẻ", example: 350000 }),
  category: z.object({ id: z.string().uuid(), name: z.string(), slug: z.string() }).nullable(),
  images: z.array(productImageItemSchema),
  variants: z.array(productVariantItemSchema),
  occasions: z.array(productOccasionItemSchema),
});

registerRoute({
  method: "get",
  path: "/api/v1/products",
  tags: ["Products"],
  summary: "Sản phẩm đang bật (cho storefront, phân trang)",
  description: "KHÔNG có isActive/createdAt/updatedAt/categoryId — khác GET /admin/products.",
  auth: false,
  request: { query: listProductsQuerySchema },
  response: { schema: publicProductSchema, paginated: true },
});

registerRoute({
  method: "get",
  path: "/api/v1/products/{slug}",
  tags: ["Products"],
  summary: "Chi tiết 1 sản phẩm theo slug (storefront)",
  description:
    "404 khi slug không tồn tại, HOẶC sản phẩm đã ẩn (isActive=false) hay đã xoá mềm — storefront " +
    "không phân biệt 2 trường hợp này với người dùng.",
  auth: false,
  request: { params: productSlugParamSchema },
  response: { schema: publicProductSchema },
  extraStatuses: [404],
});

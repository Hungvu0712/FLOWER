import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} from "./products.validation";
import { publicProductSchema } from "./products.openapi";

const TAGS = ["Admin · Products"];
const PERMISSION = "products.manage";

const productSchema = publicProductSchema.extend({
  categoryId: z.string().uuid().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Admin thấy thêm sortOrder của từng biến thể (để sắp xếp lại) — storefront không cần.
  variants: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      price: z.number().int(),
      sortOrder: z.number().int(),
    }),
  ),
});

registerRoute({
  method: "get",
  path: "/api/v1/admin/products",
  tags: TAGS,
  summary: "Danh sách đầy đủ sản phẩm (phân trang)",
  auth: { permission: PERMISSION },
  request: { query: listProductsQuerySchema },
  response: { schema: productSchema, paginated: true },
});

registerRoute({
  method: "post",
  path: "/api/v1/admin/products",
  tags: TAGS,
  summary: "Tạo sản phẩm",
  description:
    "`description`: server sanitize lại bằng allowlist thẻ trước khi lưu. Bỏ trống `slug` → tự sinh " +
    "từ `name`. `imageFileIds`: TOÀN BỘ bộ ảnh hiện tại đúng thứ tự — KHÔNG có tồn kho/stock. " +
    "`variants`: biến thể giá theo kích cỡ (tuỳ chọn) — bỏ trống thì dùng thẳng `basePrice`. " +
    "`occasionIds`: TOÀN BỘ danh sách dịp lễ đang gắn (tuỳ chọn) — 404 OCCASION_NOT_FOUND nếu có id " +
    "không tồn tại.",
  auth: { permission: PERMISSION },
  request: { body: createProductSchema },
  response: { status: 201, schema: productSchema },
  extraStatuses: [404], // 404 CATEGORY_NOT_FOUND · OCCASION_NOT_FOUND
});

registerRoute({
  method: "patch",
  path: "/api/v1/admin/products/{id}",
  tags: TAGS,
  summary: "Sửa sản phẩm",
  description:
    "`imageFileIds`: bỏ trống field (không gửi) = không đụng bộ ảnh hiện có; gửi `[]` = xoá hết ảnh; " +
    "gửi mảng = THAY THẾ hoàn toàn bộ ảnh cũ (không phải thêm vào). `variants` cùng ngữ nghĩa THAY " +
    "THẾ toàn bộ — mỗi phần tử có `id` (biến thể đã có, sẽ sửa tại chỗ) hoặc không có `id` (tạo mới). " +
    "`occasionIds` cùng ngữ nghĩa THAY THẾ toàn bộ — bỏ trống field = không đụng; gửi `[]` = gỡ hết tag.",
  auth: { permission: PERMISSION },
  request: { params: productIdParamSchema, body: updateProductSchema },
  response: { schema: productSchema },
  extraStatuses: [404], // 404 CATEGORY_NOT_FOUND · OCCASION_NOT_FOUND
});

registerRoute({
  method: "delete",
  path: "/api/v1/admin/products/{id}",
  tags: TAGS,
  summary: "Xoá mềm sản phẩm",
  description:
    "Soft delete (`deletedAt`) — khác Categories (hard delete) — vì order_items tham chiếu sản phẩm; " +
    "đơn hàng cũ vẫn hiển thị đúng tên/giá dù sản phẩm đã ngừng bán.",
  auth: { permission: PERMISSION },
  request: { params: productIdParamSchema },
  response: { schema: z.null() },
  extraStatuses: [404],
});

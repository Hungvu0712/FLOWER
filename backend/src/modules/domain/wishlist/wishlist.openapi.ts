import { z } from "zod";
import { registerRoute } from "../../../openapi/components";
import { addWishlistSchema, wishlistProductIdParamSchema } from "./wishlist.validation";

const TAGS = ["Account · Wishlist"];

const wishlistItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  basePrice: z.number().int(),
  images: z.array(z.object({ file: z.object({ url: z.string().url() }) })),
  savedAt: z.string().datetime(),
});

registerRoute({
  method: "get",
  path: "/api/v1/account/wishlist",
  tags: TAGS,
  summary: "Danh sách yêu thích của chính mình",
  auth: {},
  response: { schema: z.array(wishlistItemSchema) },
});

registerRoute({
  method: "post",
  path: "/api/v1/account/wishlist",
  tags: TAGS,
  summary: "Thêm sản phẩm vào danh sách yêu thích",
  description: "Idempotent — thêm sản phẩm đã có trong danh sách không báo lỗi.",
  auth: {},
  request: { body: addWishlistSchema },
  response: { status: 201, schema: z.object({ productId: z.string().uuid() }) },
  extraStatuses: [404], // 404 PRODUCT_NOT_FOUND
});

registerRoute({
  method: "delete",
  path: "/api/v1/account/wishlist/{productId}",
  tags: TAGS,
  summary: "Gỡ sản phẩm khỏi danh sách yêu thích",
  description: "Idempotent — gỡ sản phẩm chưa có trong danh sách không báo lỗi.",
  auth: {},
  request: { params: wishlistProductIdParamSchema },
  response: { schema: z.null() },
});

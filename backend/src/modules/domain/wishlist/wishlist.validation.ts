import { z } from "zod";

export const addWishlistSchema = z.object({ productId: z.string().uuid() });
export type AddWishlistInput = z.infer<typeof addWishlistSchema>;

export const wishlistProductIdParamSchema = z.object({ productId: z.string().uuid() });

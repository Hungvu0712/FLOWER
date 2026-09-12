import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

// Endpoint công khai (không đăng nhập) — form ở footer storefront.
export const subscribeNewsletterSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ").max(255),
});
export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;

export const unsubscribeNewsletterSchema = subscribeNewsletterSchema;
export type UnsubscribeNewsletterInput = z.infer<typeof unsubscribeNewsletterSchema>;

export const listNewsletterQuerySchema = z.object({
  isActive: zBooleanQuery(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListNewsletterQuery = z.infer<typeof listNewsletterQuerySchema>;

export const newsletterSubscriberIdParamSchema = z.object({ id: z.string().uuid() });

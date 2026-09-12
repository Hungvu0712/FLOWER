import { z } from "zod";
import { zBooleanQuery } from "../../../shared/utils/zBooleanQuery";

export const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1, "Vui lòng chọn số sao").max(5),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewIdParamSchema = z.object({ id: z.string().uuid() });

// Công khai — CHỈ hiện đánh giá ĐÃ DUYỆT (isApproved), không có option includeInactive như admin.
export const listReviewsQuerySchema = z.object({
  productId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export const listOwnReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ListOwnReviewsQuery = z.infer<typeof listOwnReviewsQuerySchema>;

// Admin (hàng đợi duyệt) — mặc định lấy TẤT CẢ (đã duyệt + chưa duyệt) trừ khi lọc rõ isApproved,
// khác listReviewsQuerySchema công khai (LUÔN chỉ đã duyệt).
export const listAdminReviewsQuerySchema = z.object({
  isApproved: zBooleanQuery(),
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type ListAdminReviewsQuery = z.infer<typeof listAdminReviewsQuerySchema>;

export const moderateReviewSchema = z.object({ isApproved: z.boolean() });
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
